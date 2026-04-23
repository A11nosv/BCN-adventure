import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
}

export interface UserProgress {
  xp: number;
  level: number;
  badges: Badge[];
  completedRoutes: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UserProgressService {
  private readonly PROGRESS_KEY = 'user_progress';
  
  private progressSubject = new BehaviorSubject<UserProgress>({
    xp: 0,
    level: 1,
    badges: [],
    completedRoutes: []
  });

  progress$ = this.progressSubject.asObservable();

  constructor() {
    this.loadProgress();
  }

  private async loadProgress() {
    const { value } = await Preferences.get({ key: this.PROGRESS_KEY });
    if (value) {
      this.progressSubject.next(JSON.parse(value));
    }
  }

  async addXP(amount: number) {
    const current = this.progressSubject.value;
    const newXP = current.xp + amount;
    const newLevel = Math.floor(newXP / 1000) + 1;
    
    const updated = { ...current, xp: newXP, level: newLevel };
    await this.saveProgress(updated);
  }

  async unlockBadge(badge: Badge) {
    const current = this.progressSubject.value;
    if (current.badges.find(b => b.id === badge.id)) return;

    badge.unlockedAt = new Date();
    const updated = { ...current, badges: [...current.badges, badge] };
    await this.saveProgress(updated);
  }

  async completeRoute(routeId: string) {
    const current = this.progressSubject.value;
    if (current.completedRoutes.includes(routeId)) return;

    const updated = { ...current, completedRoutes: [...current.completedRoutes, routeId] };
    await this.saveProgress(updated);
    await this.addXP(500); // Bonus por completar ruta
  }

  private async saveProgress(progress: UserProgress) {
    this.progressSubject.next(progress);
    await Preferences.set({
      key: this.PROGRESS_KEY,
      value: JSON.stringify(progress)
    });
  }
}

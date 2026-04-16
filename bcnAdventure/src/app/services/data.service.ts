import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';

export interface Stop {
  id: string;
  title: string;
  hints: string[];
  description: string;
  coords: [number, number];
  info: string;
  imageUrl: string;
  theatricalInfo: string;
  museumInfo?: {
    prices: string;
    note: string;
  };
}

export interface MapDetails {
  title: string;
  duration: string;
  distance: string;
  description: string;
  center: [number, number];
  zoom: number;
  stops: Stop[];
}

export interface ThemeMap {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface Theme {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  maps: ThemeMap[];
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private http = inject(HttpClient);
  private themesData: Record<string, Theme> | null = null;
  private routesData: Record<string, MapDetails> = {};

  getThemes(): Observable<Record<string, Theme>> {
    if (this.themesData) {
      return of(this.themesData);
    }
    return this.http.get<Record<string, Theme>>('assets/data/themes.json').pipe(
      map(data => {
        this.themesData = data;
        return data;
      })
    );
  }

  getTheme(themeId: string): Observable<Theme | undefined> {
    return this.getThemes().pipe(
      map(themes => themes[themeId])
    );
  }

  getRouteDetails(themeId: string, mapId: string): Observable<MapDetails | undefined> {
    if (this.routesData[mapId]) {
      return of(this.routesData[mapId]);
    }

    return this.http.get<Record<string, MapDetails>>(`assets/data/${themeId}.json`).pipe(
      map(data => {
        // Cache all routes from this theme
        Object.assign(this.routesData, data);
        return data[mapId];
      })
    );
  }
}

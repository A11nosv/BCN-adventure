import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapDetailsPage } from './map-details.page';

describe('MapDetailsPage', () => {
  let component: MapDetailsPage;
  let fixture: ComponentFixture<MapDetailsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MapDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

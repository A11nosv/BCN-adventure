import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapSelectionPage } from './map-selection.page';

describe('MapSelectionPage', () => {
  let component: MapSelectionPage;
  let fixture: ComponentFixture<MapSelectionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MapSelectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

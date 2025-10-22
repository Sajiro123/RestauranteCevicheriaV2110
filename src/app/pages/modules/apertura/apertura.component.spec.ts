import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AperturaComponent } from './apertura.component';

describe('AperturaComponent', () => {
  let component: AperturaComponent;
  let fixture: ComponentFixture<AperturaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AperturaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AperturaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

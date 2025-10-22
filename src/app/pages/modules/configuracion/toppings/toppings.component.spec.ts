import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToppingsComponent } from './toppings.component';

describe('ToppingsComponent', () => {
  let component: ToppingsComponent;
  let fixture: ComponentFixture<ToppingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToppingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToppingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
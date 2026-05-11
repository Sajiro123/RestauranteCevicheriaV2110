import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanillaComponent } from './planilla.component';

describe('PlanillaComponent', () => {
  let component: PlanillaComponent;
  let fixture: ComponentFixture<PlanillaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanillaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanillaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

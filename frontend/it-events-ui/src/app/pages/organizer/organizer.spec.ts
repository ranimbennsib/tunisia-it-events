import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Organizer } from './organizer';

describe('Organizer', () => {
  let component: Organizer;
  let fixture: ComponentFixture<Organizer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Organizer],
    }).compileComponents();

    fixture = TestBed.createComponent(Organizer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

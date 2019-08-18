import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FilesHashComponent } from './files-hash.component';

describe('FilesHashComponent', () => {
  let component: FilesHashComponent;
  let fixture: ComponentFixture<FilesHashComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FilesHashComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FilesHashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

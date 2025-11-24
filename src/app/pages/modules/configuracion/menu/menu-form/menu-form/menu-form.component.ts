import { Component, OnInit, OnChanges, Input, Output, EventEmitter } from '@angular/core';
import { Menu } from '../../../../../../model/Menu';
import { MenuService } from '../../../../../service/menu.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@Component({
  selector: 'app-menu-form',
  templateUrl: './menu-form.component.html',
  standalone: true,
  imports: [
    DialogModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    ButtonModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class MenuFormComponent implements OnInit, OnChanges {
  @Input() data: Menu | null = null;
  @Output() onSave = new EventEmitter<boolean>();
  @Output() onClose = new EventEmitter<void>();

  form: FormGroup;
  isEdit = false;


  constructor(
    private fb: FormBuilder,
    private menuService: MenuService
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      icono: [''],
      ruta: [''],
      idmenu_padre: [null],
      es_submenu: [false],
      orden: [0],
      activo: [true]
    });
  }


  ngOnInit() {
    this.updateForm();
  }

  ngOnChanges() {
    this.updateForm();
  }

  updateForm() {
    if (this.data) {
      this.isEdit = true;
      this.form.patchValue(this.data);
    } else {
      this.isEdit = false;
      this.form.reset({
        nombre: '',
        icono: '',
        ruta: '',
        idmenu_padre: null,
        es_submenu: false,
        orden: 0,
        activo: true
      });
    }
  }


  async save() {
    if (this.form.invalid) return;
    const val = this.form.value;
    if (this.isEdit && this.data?.idmenu) {
      await this.menuService.updateMenu(this.data.idmenu, val);
    } else {
      await this.menuService.addMenu(val);
    }
    this.onSave.emit(true);
  }

  close() {
    this.onClose.emit();
  }
}
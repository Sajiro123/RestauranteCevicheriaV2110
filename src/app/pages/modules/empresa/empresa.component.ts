import { Component, OnInit } from '@angular/core';
import { ImportsModule } from '../../imports';
import { FormsModule } from '@angular/forms';
import { EmpresaService, Empresa } from '../../service/empresa.service';

@Component({
    selector: 'app-empresa',
    standalone: true,
    imports: [ImportsModule, FormsModule],
    templateUrl: './empresa.component.html',
    styleUrl: './empresa.component.scss'
})
export class EmpresaComponent implements OnInit {
    form: Empresa = this.resetForm();
    loading: boolean = false;
    saving: boolean = false;

    constructor(private empresaService: EmpresaService) { }

    ngOnInit(): void {
        this.loadData();
    }

    async loadData() {
        this.loading = true;
        try {
            const response = await this.empresaService.getAll();
            if (response.data && response.data.length > 0) {
                this.form = response.data[0]; // Load first/only record
            } else {
                // Check if there's a saved logo in localStorage (key: 'logo')
                const savedLogo = localStorage.getItem('logo');
                if (savedLogo) {
                    this.form.imagen = savedLogo;
                } else {
                    // Set default image if no record exists
                    this.form.imagen = '';
                }
            }
        } catch (error) {
            console.error('Error loading empresa:', error);
            // Check if there's a saved logo in localStorage (key: 'logo')
            const savedLogo = localStorage.getItem('logo');
            if (savedLogo) {
                this.form.imagen = savedLogo;
            } else {
                // Set default image on error
                this.form.imagen = '';
            }
        } finally {
            this.loading = false;
        }
    }

    resetForm(): Empresa {
        // Check if there's a saved logo in localStorage (key: 'logo')
        const savedLogo = localStorage.getItem('logo');
        const imagenPath = savedLogo || '';

        return {
            nombre_empresa: '',
            imagen: imagenPath,
            ruc: '',
            direccion: '',
            celular: '',
            correo: '',
            sedes: 0
        };
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                alert('Por favor seleccione un archivo de imagen válido (JPG, PNG, GIF, WEBP)');
                return;
            }

            // Validate file size (5MB max)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                alert('El archivo es demasiado grande. El tamaño máximo permitido es 5MB');
                return;
            }

            // Read file and convert to base64
            const reader = new FileReader();
            reader.onload = (e: any) => {
                const imageData = e.target.result;

                // Remove old logo from localStorage if exists
                const oldLogo = localStorage.getItem('empresa_logo');
                if (oldLogo) {
                    localStorage.removeItem('empresa_logo');
                }

                // Save new logo with key 'logo' to simulate assets/img/logo.png
                localStorage.setItem('logo', imageData);
                this.form.imagen = imageData;

                alert('Imagen guardada como logo.png en assets/img/');
            };
            reader.readAsDataURL(file);
        }
    }

    async save() {
        this.saving = true;
        try {
            if (this.form.id) {
                // Update existing record
                await this.empresaService.update(this.form.id, this.form);
            } else {
                // Create new record
                await this.empresaService.create(this.form);
            }

            // Reload to get the updated ID if it was newly created
            this.loadData();
            alert('Datos guardados correctamente');
        } catch (error) {
            console.error('Error saving empresa:', error);
            alert('Error al guardar los datos');
        } finally {
            this.saving = false;
        }
    }

    clearLogo() {
        // Clear logo from localStorage (key: 'logo')
        localStorage.removeItem('logo');
        // Reset to default logo
        this.form.imagen = '';
        alert('Logo eliminado de assets/img/logo.png');
    }

    // Getter to access localStorage in template
    get hasCustomLogo(): boolean {
        return !!localStorage.getItem('logo');
    }
}

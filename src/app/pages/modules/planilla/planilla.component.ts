import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { AsistenciaService } from '../../../services/asistencia.service';
import { SupabaseService } from '../../../services/supabase.service';
import { EmpresaService } from '../../service/empresa.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface RegistroPlanilla {
    id_planilla?: number;
    idpersona: number;
    nombre_persona?: string;
    cargo_persona?: string;
    salario: number;
    dias_trabajados: number;
    tardanzas_cantidad_dias: number;
    descuento: number;
    monto_neto: number;
    laborinicio: string;
    laborfin: string;
    observacion?: string;
    frecuencia?: string;
    faltas?: number;
    extra?: number;
    // IDs de adelantos pendientes que  se aplicarán al guardar
    _adelantosIds?: number[];
}

export interface AdelantoSalario {
    id_adelanto?: number;
    idpersona: number;
    nombre_persona?: string;
    monto: number;
    fecha_adelanto: string;
    estado: 'PENDING' | 'DEDUCTED';
    tipo?: number; // 1 = Descuento, 2 = Adelanto
    notas?: string;
    id_planilla?: number;
    created_at?: string;
}

@Component({
    selector: 'app-planilla',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, DialogModule],
    templateUrl: './planilla.component.html',
    styleUrl: './planilla.component.scss'
})
export class PlanillaComponent implements OnInit {
    planillas: RegistroPlanilla[] = [];
    empleados: any[] = [];
    empleadoSeleccionado: any = '';

    // Filtros principales
    fechaInicioFiltro: string = '';
    fechaFinFiltro: string = '';

    // Variables para el Modal de Cálculo
    displayCalculoModal: boolean = false;
    fechaInicioCalc: string = '';
    fechaFinCalc: string = '';
    frecuenciaPagoGlobal: string = 'Mensual';
    calculoGenerado: boolean = false;
    planillasGeneradas: RegistroPlanilla[] = [];
    modoEdicion: boolean = false;
    empresaInfo: any = null;

    // ── Adelantos de Sueldo ──────────────────────────────────────────
    displayAdelantosModal: boolean = false;
    adelantos: AdelantoSalario[] = [];
    adelantoForm: FormGroup;
    guardandoAdelanto: boolean = false;
    totalPendiente: number = 0;
    cargandoAdelantos: boolean = false;

    constructor(
        private asistenciaService: AsistenciaService,
        private supabaseService: SupabaseService,
        private empresaService: EmpresaService,
        private fb: FormBuilder
    ) {
        this.adelantoForm = this.fb.group({
            idpersona: [null, Validators.required],
            monto: [null, [Validators.required, Validators.min(1)]],
            fecha_adelanto: [new Date().toISOString().split('T')[0], Validators.required],
            tipo: [1, Validators.required],
            notas: ['']
        });
    }

    ngOnInit() {
        this.cargarEmpleados().then(() => {
            // Cargar adelantos después de tener los empleados, para resolver nombres correctamente
            this.listarAdelantos();
        });
        this.cargarEmpresa();
    }

    // ── Adelantos: abrir modal ───────────────────────────────────────
    abrirModalAdelantos() {
        this.displayAdelantosModal = true;
        this.adelantoForm.reset({
            idpersona: null,
            monto: null,
            fecha_adelanto: new Date().toISOString().split('T')[0],
            tipo: 1,
            notas: ''
        });
        this.listarAdelantos();
    }

    // ── Adelantos: listar todos los PENDING ──────────────────────────
    async listarAdelantos() {
        this.cargandoAdelantos = true;
        const { data, error } = await this.supabaseService.client
            // Cambia tu .select() para que quede así:
            .from('adelanto_salario')
            .select(`*, persona:persona!adelanto_salario_persona_fk (nombres)`)
            .is('deleted', null)
            .eq('estado', 'PENDING')
            .order('fecha_adelanto', { ascending: false });
        this.cargandoAdelantos = false;
        if (error) {
            console.error('Error adelantos:', error);
            return;
        }

        this.adelantos = (data || []).map((d: any) => ({
            id_adelanto: d.id_adelanto,
            idpersona: d.idpersona,
            nombre_persona: d.persona?.nombres || 'Empleado',
            monto: d.monto,
            fecha_adelanto: d.fecha_adelanto,
            estado: d.estado,
            tipo: d.tipo ?? 1,
            notas: d.notas,
            created_at: d.created_at
        }));

        this.totalPendiente = this.adelantos.reduce((sum, a) => sum + Number(a.monto), 0);
    }

    // ── Adelantos: guardar nuevo ──────────────────────────────────────
    async guardarAdelanto() {
        if (this.adelantoForm.invalid) {
            this.adelantoForm.markAllAsTouched();
            return;
        }
        this.guardandoAdelanto = true;
        const val = this.adelantoForm.value;

        const { error } = await this.supabaseService.client.from('adelanto_salario').insert({
            idpersona: val.idpersona,
            monto: val.monto,
            fecha_adelanto: val.fecha_adelanto,
            estado: 'PENDING',
            tipo: val.tipo ?? 1,
            notas: val.notas || null
        });

        this.guardandoAdelanto = false;
        if (error) {
            console.error('Error al guardar adelanto:', error);
            alert('Error al guardar. Revise consola.');
            return;
        }

        this.adelantoForm.reset({
            idpersona: null,
            monto: null,
            fecha_adelanto: new Date().toISOString().split('T')[0],
            tipo: 1,
            notas: ''
        });
        this.listarAdelantos();
    }

    // ── Adelantos: marcar como descontado ────────────────────────────
    async marcarDescontado(a: AdelantoSalario) {
        if (!confirm(`¿Marcar el adelanto de ${a.nombre_persona} (S/ ${a.monto}) como DESCONTADO?`)) return;

        const { error } = await this.supabaseService.client.from('adelanto_salario').update({ estado: 'DEDUCTED' }).eq('id_adelanto', a.id_adelanto);

        if (error) {
            console.error('Error al actualizar:', error);
            return;
        }
        this.listarAdelantos();
    }

    // ── Adelantos: eliminar (soft delete) ────────────────────────────
    async eliminarAdelanto(a: AdelantoSalario) {
        if (!confirm(`¿Eliminar el adelanto de ${a.nombre_persona}?`)) return;

        const { error } = await this.supabaseService.client.from('adelanto_salario').update({ deleted: 1 }).eq('id_adelanto', a.id_adelanto);

        if (error) {
            console.error('Error al eliminar adelanto:', error);
            return;
        }
        this.listarAdelantos();
    }

    // ── Helper: nombre del empleado por id ──────────────────────────
    getNombreEmpleado(idpersona: number): string {
        const emp = this.empleados.find((e) => (e.idpersona || e.id_persona) == idpersona);
        return emp ? emp.nombres : 'Empleado';
    }

    async cargarEmpresa() {
        const res = await this.empresaService.getAll();
        if (res.data && res.data.length > 0) {
            this.empresaInfo = res.data[0];
        }
    }
    async cargarEmpleados() {
        const res = await this.supabaseService.getTrabajadores();
        if (res.success) {
            this.empleados = res.data || [];
        } else {
            console.error('Error al cargar empleados:', res.error);
        }
    }

    abrirModalCalculo() {
        this.displayCalculoModal = true;
        this.calculoGenerado = false;
        this.modoEdicion = false;
        this.planillasGeneradas = [];
        this.fechaInicioCalc = this.fechaInicioFiltro;
        this.fechaFinCalc = this.fechaFinFiltro;
        this.frecuenciaPagoGlobal = 'Mensual';
    }

    nombreEmpleadoModal(): string {
        if (!this.empleadoSeleccionado) return 'Todos los empleados';
        const emp = this.empleados.find((e) => (e.idpersona || e.id_persona) == this.empleadoSeleccionado);
        return emp ? emp.nombres : 'Todos los empleados';
    }

    async calcularPlanilla() {
        if (!this.fechaInicioCalc || !this.fechaFinCalc) {
            alert('Por favor ingrese la fecha de inicio y fin');
            return;
        }

        console.log('Calculando para fechas:', this.fechaInicioCalc, this.fechaFinCalc);

        // Consultar apertura_caja
        const { data: aperturas, error } = await this.supabaseService.client.from('apertura_caja').select('*').is('deleted', null).gte('fecha', this.fechaInicioCalc).lte('fecha', this.fechaFinCalc);

        if (error) {
            console.error('Error al obtener aperturas:', error);
            alert('Error al obtener datos de caja');
            return;
        }

        // Contar días trabajados por persona
        const conteoDias: { [id: number]: number } = {};
        if (aperturas) {
            for (const ap of aperturas) {
                if (ap.trabajadores) {
                    const ids = ap.trabajadores
                        .split(',')
                        .map((id: string) => parseInt(id.trim(), 10))
                        .filter((id: number) => !isNaN(id));
                    for (const id of ids) {
                        conteoDias[id] = (conteoDias[id] || 0) + 1;
                    }
                }
            }
        }

        this.planillasGeneradas = [];

        // Filtrar empleados si hay uno seleccionado
        const empleadosAProcesar = this.empleadoSeleccionado ? this.empleados.filter((e) => (e.idpersona || e.id_persona) == this.empleadoSeleccionado) : this.empleados;

        // ── Cargar adelantos PENDING agrupados por persona ──────────────
        const { data: adelantosPending } = await this.supabaseService.client.from('adelanto_salario').select('id_adelanto, idpersona, monto, notas, fecha_adelanto').or('deleted.is.null,deleted.eq.0').eq('estado', 'PENDING');

        // Agrupar adelantos por idpersona
        const adelantosPorPersona: { [id: number]: { total: number; ids: number[]; notas: string[] } } = {};
        for (const ad of adelantosPending || []) {
            if (!adelantosPorPersona[ad.idpersona]) {
                adelantosPorPersona[ad.idpersona] = { total: 0, ids: [], notas: [] };
            }
            adelantosPorPersona[ad.idpersona].total += Number(ad.monto);
            adelantosPorPersona[ad.idpersona].ids.push(ad.id_adelanto);
            if (ad.notas) {
                adelantosPorPersona[ad.idpersona].notas.push(`Adelanto S/ ${Number(ad.monto).toFixed(2)} (${ad.fecha_adelanto}): ${ad.notas}`);
            } else {
                adelantosPorPersona[ad.idpersona].notas.push(`Adelanto S/ ${Number(ad.monto).toFixed(2)} (${ad.fecha_adelanto})`);
            }
        }
        // ────────────────────────────────────────────────────────────────

        for (const emp of empleadosAProcesar) {
            const id = emp.idpersona || emp.id_persona;
            const dias = conteoDias[id] || 0;

            const salarioBase = emp.sueldo || emp.salario || 0;

            // Adelantos pendientes de este empleado
            const adelantoEmp = adelantosPorPersona[id];
            const descuentoAdelanto = adelantoEmp ? adelantoEmp.total : 0;
            const notasAdelanto = adelantoEmp ? adelantoEmp.notas.join('\n') : '';
            const adelantosIds = adelantoEmp ? adelantoEmp.ids : [];

            this.planillasGeneradas.push({
                idpersona: id,
                nombre_persona: emp.nombres,
                cargo_persona: emp.perfil?.nombre || 'Personal',
                salario: salarioBase,
                dias_trabajados: dias,
                tardanzas_cantidad_dias: 0,
                faltas: 0,
                descuento: descuentoAdelanto,
                extra: 0,
                monto_neto: 0, // Se recalculará enseguida
                laborinicio: this.fechaInicioCalc,
                laborfin: this.fechaFinCalc,
                observacion: notasAdelanto,
                frecuencia: this.frecuenciaPagoGlobal,
                _adelantosIds: adelantosIds
            });
        }

        // Recalcular montos netos iniciales
        for (const p of this.planillasGeneradas) {
            this.recalcularNeto(p);
        }

        this.calculoGenerado = true;
    }

    recalcularNeto(p: RegistroPlanilla, diasLaborablesMes: number = 24) {
        const diasTrabajados = p.dias_trabajados || 0;
        const tardanzasDias = p.tardanzas_cantidad_dias || 0;
        const descuentoAdicional = p.descuento || 0;
        const extraAdicional = p.extra || 0;

        // Valor día según los días laborables reales del mes (no 30)
        const valorDia = p.salario / diasLaborablesMes;

        // Sueldo proporcional a los días efectivamente trabajados
        const sueldoGanado = valorDia * diasTrabajados;

        // Descuentos
        const descuentoTardanzas = tardanzasDias * 5;
        const totalDescuentos = descuentoTardanzas + descuentoAdicional;

        let neto = sueldoGanado - totalDescuentos + extraAdicional;
        neto = Math.max(0, neto);

        p.monto_neto = Math.round(neto * 100) / 100;
    }

    async registrarPlanilla() {
        if (this.modoEdicion && this.planillasGeneradas.length === 1 && this.planillasGeneradas[0].id_planilla) {
            const p = this.planillasGeneradas[0];
            const record = {
                salario: p.salario,
                dias_trabajados: p.dias_trabajados,
                tardanzas_cantidad_dias: p.tardanzas_cantidad_dias,
                descuento: p.descuento,
                extra: p.extra,
                monto_neto: p.monto_neto,
                observacion: p.observacion,
                frecuencia: p.frecuencia,
                faltas: p.faltas || 0
            };

            const { error } = await this.supabaseService.client.from('registro_planilla').update(record).eq('id_planilla', p.id_planilla);

            if (error) {
                console.error('Error al actualizar:', error);
                alert('Error al actualizar en la base de datos. Verifique consola.');
                return;
            }

            // Marcar adelantos como DEDUCTED si los hay
            if (p._adelantosIds && p._adelantosIds.length > 0) {
                await this.supabaseService.client.from('adelanto_salario').update({ estado: 'DEDUCTED' }).in('id_adelanto', p._adelantosIds);
            }
        } else {
            const records = this.planillasGeneradas.map((p) => ({
                idpersona: p.idpersona,
                salario: p.salario,
                dias_trabajados: p.dias_trabajados,
                tardanzas_cantidad_dias: p.tardanzas_cantidad_dias,
                descuento: p.descuento,
                extra: p.extra,
                monto_neto: p.monto_neto,
                laborinicio: p.laborinicio,
                laborfin: p.laborfin,
                observacion: p.observacion,
                frecuencia: p.frecuencia,
                faltas: p.faltas || 0
            }));

            const { error } = await this.supabaseService.client.from('registro_planilla').insert(records);

            if (error) {
                console.error('Error al registrar:', error);
                alert('Error al guardar en la base de datos. Verifique consola.');
                return;
            }

            // Marcar adelantos PENDING como DEDUCTED para cada persona registrada
            for (const p of this.planillasGeneradas) {
                if (p._adelantosIds && p._adelantosIds.length > 0) {
                    await this.supabaseService.client.from('adelanto_salario').update({ estado: 'DEDUCTED' }).in('id_adelanto', p._adelantosIds);
                }
            }
        }

        this.displayCalculoModal = false;
        this.listarPlanillas();
        // Actualizar la lista de adelantos por si el modal de adelantos estaba abierto
        this.listarAdelantos();
    }

    editarPlanilla(p: RegistroPlanilla) {
        this.modoEdicion = true;
        this.planillasGeneradas = [{ ...p }];
        this.displayCalculoModal = true;
        this.calculoGenerado = true;
    }

    async eliminarPlanilla(p: RegistroPlanilla) {
        if (!p.id_planilla) return;
        if (!confirm(`¿Eliminar la planilla de ${p.nombre_persona}?`)) return;

        const { error } = await this.supabaseService.client.from('registro_planilla').update({ deleted: 1 }).eq('id_planilla', p.id_planilla);

        if (error) {
            console.error('Error al eliminar:', error);
            alert('Error al eliminar. Verifique consola.');
            return;
        }

        this.listarPlanillas();
    }

    getNombreDia(fecha: string): string {
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const fechaObj = new Date(fecha + 'T00:00:00');
        return diasSemana[fechaObj.getDay()];
    }

    async descargarPDF(p: RegistroPlanilla) {
        const doc = new jsPDF('p', 'mm', 'a4');

        // Paleta de colores del diseño de Tailwind
        const colors = {
            primary: [4, 22, 50] as [number, number, number], // #041632
            primaryContainer: [27, 43, 72] as [number, number, number], // #1b2b48
            surfaceContainer: [236, 238, 240] as [number, number, number], // #eceef0
            surfaceContainerLowest: [255, 255, 255] as [number, number, number], // #ffffff
            surfaceContainerLow: [242, 244, 246] as [number, number, number], // #f2f4f6
            outlineVariant: [197, 198, 206] as [number, number, number], // #c5c6ce
            onSurface: [25, 28, 30] as [number, number, number], // #191c1e
            onSurfaceVariant: [68, 71, 77] as [number, number, number], // #44474d
            error: [186, 26, 26] as [number, number, number], // #ba1a1a
            tertiaryContainer: [0, 157, 211] as [number, number, number] // #009dd3
        };

        // Configuración inicial
        const marginX = 20;
        let currentY = 20;

        // --- CABECERA ---
        // Izquierda: Logo y Título de Empresa
        let textX = marginX;

        if (this.empresaInfo && this.empresaInfo.imagen) {
            try {
                // Se asume que la imagen está en formato base64 con el prefijo data:image/...
                // Los formatos más comunes (JPEG, PNG, WEBP) son compatibles
                doc.addImage(this.empresaInfo.imagen, marginX, currentY - 8, 14, 14);
                textX += 17; // Desplazar texto a la derecha del logo
            } catch (e) {
                console.warn('Error al cargar imagen en PDF:', e);
            }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(...colors.primaryContainer);
        const nombreEmp = this.empresaInfo?.nombre_empresa || 'Falta ingresar el nombre de la empresa';
        doc.text(nombreEmp, textX, currentY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...colors.onSurfaceVariant);
        const nombreSec = 'WILLY NORTEÑO SAC';
        doc.text(nombreSec, textX, currentY + 6);

        // Derecha: NOTA DE PAGO
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...colors.primaryContainer);
        doc.text('NOTA DE PAGO', 190, currentY, { align: 'right' });

        doc.setFontSize(10);
        doc.setTextColor(...colors.onSurfaceVariant);
        doc.text('Reporte de Planilla', 190, currentY + 5, { align: 'right' });

        const fechaEmision = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.text(`Fecha de Emisión:      `, 160, currentY + 11, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(fechaEmision, 190, currentY + 11, { align: 'right' });

        // Línea separadora principal
        currentY += 16;
        doc.setDrawColor(...colors.outlineVariant);
        doc.setLineWidth(0.3);
        doc.line(marginX, currentY, 190, currentY);
        currentY += 8;

        // --- INFORMACIÓN DEL EMPLEADO ---
        const boxHeight = 45;

        // Contenedor principal Info Empleado
        doc.setDrawColor(...colors.outlineVariant);
        doc.setFillColor(...colors.surfaceContainerLowest);
        doc.roundedRect(marginX, currentY, 170, boxHeight, 1, 1, 'FD');

        // Cabecera Info Empleado (Gris)
        doc.setFillColor(...colors.surfaceContainer);
        doc.roundedRect(marginX, currentY, 170, 8, 1, 1, 'F');
        // Borde inferior de la cabecera gris
        doc.line(marginX, currentY + 8, 190, currentY + 8);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.primaryContainer);
        doc.text('Información del Empleado', marginX + 4, currentY + 5.5);

        // Datos del empleado dentro de la caja
        currentY += 14;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...colors.onSurfaceVariant);
        doc.text('Nombre Completo', marginX + 4, currentY);
        doc.text('DNI', marginX + 85, currentY);

        currentY += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.onSurface);
        doc.text(p.nombre_persona || '', marginX + 4, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(`EMP-${(p.idpersona || 0).toString().padStart(4, '0')}`, marginX + 85, currentY);

        currentY += 8;
        doc.setFontSize(8);
        doc.setTextColor(...colors.onSurfaceVariant);
        doc.text('Cargo', marginX + 4, currentY);
        doc.text('Frecuencia / Periodo', marginX + 85, currentY);

        currentY += 5;
        doc.setFontSize(10);
        doc.setTextColor(...colors.onSurface);
        doc.text(p.cargo_persona || 'Personal', marginX + 4, currentY);

        const inicioStr = p.laborinicio ? new Date(p.laborinicio + 'T00:00:00').toLocaleDateString('es-PE') : '-';
        const finStr = p.laborfin ? new Date(p.laborfin + 'T00:00:00').toLocaleDateString('es-PE') : '-';
        doc.text(`${p.frecuencia || 'Mensual'} | ${inicioStr} al ${finStr}`, marginX + 85, currentY);

        currentY += 15;

        const diasLaborablesMes = 24;
        const sueldoGanado = (p.salario / diasLaborablesMes) * (p.dias_trabajados || 0);
        const dctoFaltas = 0;
        const dctoTardanzas = (p.tardanzas_cantidad_dias || 0) * 5;
        const dctoExtra = p.descuento || 0;
        const totalDescuentos = dctoFaltas + dctoTardanzas + dctoExtra;
        const totalIngresosBrutos = Number(p.salario) + Number(p.extra || 0);
        const totalSinDescuento = sueldoGanado + Number(p.extra || 0);

        const bodyData = [
            ['Salario Base', `Mes asignado`, `S/ ${Number(p.salario).toFixed(2)}`],
            ['Días Contabilizados', `${p.dias_trabajados || 0} días`, `-`]
        ];

        if (p.faltas && p.faltas > 0) {
            bodyData.push(['Inasistencias', `${p.faltas} días`, `- S/ ${dctoFaltas.toFixed(2)}`]);
        }
        if (p.tardanzas_cantidad_dias && p.tardanzas_cantidad_dias > 0) {
            bodyData.push(['Tardanzas', `${p.tardanzas_cantidad_dias} hrs/faltas`, `- S/ ${dctoTardanzas.toFixed(2)}`]);
        }

        if (p.extra && p.extra > 0) {
            bodyData.push(['Bonificaciones Extras', 'Movilidad/Alimentación/Otros', `+ S/ ${Number(p.extra).toFixed(2)}`]);
        }

        autoTable(doc, {
            startY: currentY,
            margin: { left: marginX, right: 20 },
            head: [['Concepto', 'Detalle', 'Monto']],
            body: bodyData,
            theme: 'grid',
            headStyles: {
                fillColor: colors.primaryContainer,
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 9,
                cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }
            },
            styles: {
                fontSize: 9,
                textColor: colors.onSurface,
                lineColor: colors.outlineVariant,
                lineWidth: 0.1,
                cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }
            },
            alternateRowStyles: {
                fillColor: [241, 245, 249] // #f1f5f9
            },
            columnStyles: {
                0: { fontStyle: 'bold' },
                1: { halign: 'right', textColor: colors.onSurfaceVariant },
                2: { halign: 'right', fontStyle: 'bold' }
            },
            didParseCell: function (data) {
                // Colorear descuentos de rojo/naranja y bonificaciones de azul
                if (data.section === 'body') {
                    const concepto = (data.row.raw as any)[0];
                    if (concepto === 'Descuentos Adicionales' || concepto === 'Inasistencias' || concepto === 'Tardanzas') {
                        data.cell.styles.textColor = colors.error;
                    }
                    if (concepto === 'Adelanto de Sueldo') {
                        // Naranja para diferenciar adelantos de descuentos normales
                        data.cell.styles.textColor = [180, 83, 9]; // #b45309
                    }
                    if (concepto === 'Bonificaciones Extras') {
                        data.cell.styles.textColor = colors.tertiaryContainer;
                    }
                }
            }
        });

        currentY = (doc as any).lastAutoTable.finalY + 12;

        // --- RESUMEN Y NETO A PAGAR ---
        // Contenedor del resumen (Mitad derecha)
        const summaryWidth = 85;
        const summaryX = 190 - summaryWidth;

        doc.setDrawColor(...colors.outlineVariant);
        doc.setFillColor(...colors.surfaceContainerLowest);
        doc.roundedRect(summaryX, currentY, summaryWidth, 47, 1, 1, 'FD');

        // Cabecera Resumen
        doc.setFillColor(...colors.surfaceContainer);
        doc.roundedRect(summaryX, currentY, summaryWidth, 8, 1, 1, 'F');
        doc.line(summaryX, currentY + 8, summaryX + summaryWidth, currentY + 8);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.primaryContainer);
        doc.text('Resumen del Período', summaryX + 4, currentY + 5.5);

        currentY += 14;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.onSurfaceVariant);
        doc.text('Total Ingresos Brutos', summaryX + 4, currentY);
        doc.setTextColor(...colors.onSurface);
        doc.text(`S/ ${totalIngresosBrutos.toFixed(2)}`, summaryX + summaryWidth - 4, currentY, { align: 'right' });

        currentY += 6;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.tertiaryContainer);
        doc.text('Total Sin Descuento', summaryX + 4, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(`S/ ${totalSinDescuento.toFixed(2)}`, summaryX + summaryWidth - 4, currentY, { align: 'right' });

        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.error);
        doc.text('Total Descuentos', summaryX + 4, currentY);
        doc.text(`- S/ ${totalDescuentos.toFixed(2)}`, summaryX + summaryWidth - 4, currentY, { align: 'right' });

        currentY += 5;
        doc.setDrawColor(...colors.primaryContainer);
        doc.setLineWidth(0.5);
        doc.line(summaryX + 4, currentY, summaryX + summaryWidth - 4, currentY);

        currentY += 8;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.primaryContainer);
        doc.text('MONTO NETO A PAGAR', summaryX + 4, currentY);
        doc.setFontSize(14);
        doc.text(`S/ ${Number(p.monto_neto).toFixed(2)}`, summaryX + summaryWidth - 4, currentY, { align: 'right' });

        currentY += 20;

        // --- OBSERVACIONES ADICIONALES ---
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.onSurfaceVariant);
        doc.text('Observaciones Adicionales', marginX, currentY);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...colors.onSurface);

        const obsText = p.observacion ? p.observacion : '"Sin observaciones adicionales para el periodo."';
        // Dividir el texto en múltiples líneas si es más ancho que 160mm
        const splitObsText = doc.splitTextToSize(obsText, 162);

        // Calcular el alto dinámico basado en la cantidad de líneas (5mm por línea aprox + 10 de margen)
        const obsBoxHeight = Math.max(15, splitObsText.length * 5 + 6);

        currentY += 4;
        doc.setDrawColor(...colors.outlineVariant);
        doc.setFillColor(...colors.surfaceContainerLow);
        doc.roundedRect(marginX, currentY, 170, obsBoxHeight, 1, 1, 'FD');

        // Imprimir las líneas ajustadas
        doc.text(splitObsText, marginX + 4, currentY + 7);

        // --- FIRMAS ---
        currentY = 240; // Fijar al fondo de la hoja
        doc.setDrawColor(...colors.outlineVariant);
        doc.setLineWidth(0.3);
        doc.line(marginX, currentY, 190, currentY);

        currentY += 20;
        doc.addPage();

        const { data: diasData, error: errorDias } = await this.supabaseService.client.rpc('get_dias_trabajados', {
            fecha_inicio: p.laborinicio,
            fecha_fin: p.laborfin,
            id_persona: p.idpersona
        });

        const diasTrabajados = diasData && diasData.length > 0 ? diasData[0] : null;

        // --- CABECERA PÁGINA 2 ---
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, 210, 22, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.text('REGISTRO DE ASISTENCIA', marginX, 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(180, 195, 215);
        doc.text(`Empleado: ${p.nombre_persona || ''}  |  Período: ${inicioStr} al ${finStr}`, 190, 14, { align: 'right' });

        let pageY = 30;

        // --- RESUMEN DE DÍAS ---
        const fechasStr = diasTrabajados?.fechas_asistidas || '';
        const diasList = fechasStr
            ? fechasStr
                  .split(',')
                  .map((f: string) => f.trim())
                  .filter((f: string) => f)
            : [];

        const totalDias = diasList.length;

        // Tarjetas de resumen
        const cardW = 50;
        const cardGap = 10;
        const cardStartX = marginX;

        const resumenItems = [
            { label: 'Días Asistidos', value: `${totalDias}`, color: colors.primaryContainer as [number, number, number] },
            { label: 'Faltas', value: `${p.faltas || 0}`, color: colors.error as [number, number, number] },
            { label: 'Tardanzas', value: `${p.tardanzas_cantidad_dias || 0}`, color: colors.tertiaryContainer as [number, number, number] }
        ];

        resumenItems.forEach((item, idx) => {
            const cx = cardStartX + idx * (cardW + cardGap);
            doc.setDrawColor(...colors.outlineVariant);
            doc.setFillColor(...colors.surfaceContainerLow);
            doc.roundedRect(cx, pageY, cardW, 18, 1.5, 1.5, 'FD');

            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colors.onSurfaceVariant);
            doc.text(item.label, cx + cardW / 2, pageY + 6, { align: 'center' });

            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...item.color);
            doc.text(item.value, cx + cardW / 2, pageY + 14, { align: 'center' });
        });

        pageY += 26;

        // --- TABLA DE ASISTENCIA ---
        const tableBody = diasList.map((fecha: string, idx: number) => {
            const diaSemana = this.getNombreDia(fecha);
            return [`${idx + 1}`, fecha, diaSemana, '✓'];
        });

        autoTable(doc, {
            startY: pageY,
            margin: { left: marginX, right: 20 },
            head: [['N°', 'Fecha', 'Día', 'Estado']],
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: colors.primaryContainer,
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'center',
                cellPadding: { top: 4, bottom: 4, left: 4, right: 4 }
            },
            styles: {
                fontSize: 9,
                textColor: colors.onSurface,
                lineColor: colors.outlineVariant,
                lineWidth: 0.1,
                cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }
            },
            alternateRowStyles: {
                fillColor: [242, 245, 250]
            },
            columnStyles: {
                0: { halign: 'center', fontStyle: 'bold', cellWidth: 15 },
                1: { halign: 'center', cellWidth: 45 },
                2: { halign: 'left' },
                3: { halign: 'center', cellWidth: 20, textColor: [34, 139, 34], fontStyle: 'bold' }
            }
        });

        const fileName = `Nota_Pago_${p.nombre_persona?.replace(/\s+/g, '_')}_${fechaEmision}.pdf`;
        doc.save(fileName);
    }

    async listarPlanillas() {
        if (!this.fechaInicioFiltro || !this.fechaFinFiltro) {
            // Puede que no hayan seleccionado fechas, retornar
            return;
        }

        let query = this.supabaseService.client
            .from('registro_planilla')
            .select(
                `
        *,
        persona:idpersona (nombres, idperfil)
      `
            )
            .gte('laborinicio', this.fechaInicioFiltro)
            .lte('laborfin', this.fechaFinFiltro)
            .or('deleted.eq.0,deleted.is.null');

        if (this.empleadoSeleccionado) {
            query = query.eq('idpersona', this.empleadoSeleccionado);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error al listar:', error);
            return;
        }

        if (data) {
            this.planillas = data.map((d: any) => ({
                id_planilla: d.id_planilla,
                idpersona: d.idpersona,
                nombre_persona: d.persona?.nombres || 'Empleado',
                cargo_persona: 'Personal',
                salario: d.salario,
                dias_trabajados: d.dias_trabajados,
                tardanzas_cantidad_dias: d.tardanzas_cantidad_dias,
                descuento: d.descuento,
                extra: d.extra,
                faltas: d.faltas || 0,
                monto_neto: d.monto_neto,
                laborinicio: d.laborinicio,
                laborfin: d.laborfin,
                observacion: d.observacion,
                frecuencia: d.frecuencia
            }));
        }
    }
}

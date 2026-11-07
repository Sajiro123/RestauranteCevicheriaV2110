/**
 * Utilidad centralizada para manejo de fechas y horas en Zona Horaria oficial de Perú (America/Lima, UTC-5).
 */

export function getFechaPeru(date: Date = new Date()): string {
    // Retorna YYYY-MM-DD en zona horaria America/Lima
    return date.toLocaleDateString('en-CA', {
        timeZone: 'America/Lima'
    });
}

export function getHoraPeru(date: Date = new Date()): string {
    // Retorna HH:MM:SS en zona horaria America/Lima
    return date.toLocaleTimeString('es-PE', {
        timeZone: 'America/Lima',
        hour12: false
    });
}

export function getFechaHoraIsoPeru(date: Date = new Date()): string {
    const fecha = getFechaPeru(date);
    const hora = getHoraPeru(date);
    return `${fecha}T${hora}`;
}

export function getFechaTextoPeru(dateInput?: Date | string): string {
    let d: Date;
    if (!dateInput) {
        d = new Date();
    } else if (typeof dateInput === 'string') {
        // Si viene en formato YYYY-MM-DD, asegurar mediodía para evitar desfases por timezone
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            d = new Date(`${dateInput}T12:00:00`);
        } else {
            d = new Date(dateInput);
        }
    } else {
        d = dateInput;
    }

    const opciones: Intl.DateTimeFormatOptions = {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    };
    const formateada = d.toLocaleDateString('es-PE', opciones);
    return formateada.replace(' de ', ' de ').replace(' de ', ' del ');
}

import Handlebars from "handlebars";

// Flag para evitar registrar los helpers múltiples veces
let helpersRegistered = false;

/**
 * Registra helpers personalizados para Handlebars
 * Estos helpers deben coincidir con los del backend para asegurar
 * que la vista previa se vea igual al documento final
 */
export function registerHandlebarsHelpers() {
  // Solo registrar una vez
  if (helpersRegistered) return;

  // Partial: cabecera institucional (debe coincidir con el backend)
  Handlebars.registerPartial(
    "institutionHeader",
    `<div style="text-align:center;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid #d1d5db;">` +
      `{{#if _metadata.institutionLogo}}<img src="{{_metadata.institutionLogo}}" alt="Logo" style="height:52px;object-fit:contain;display:block;margin:0 auto 6px;">{{/if}}` +
      `{{#if _metadata.institutionName}}<div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:2px;">{{_metadata.institutionName}}</div>{{/if}}` +
      `{{#if _metadata.institutionAddress}}<div style="font-size:9.5px;color:#6b7280;">{{_metadata.institutionAddress}}</div>{{/if}}` +
      `{{#if _metadata.institutionPhone}}<div style="font-size:9.5px;color:#6b7280;">{{_metadata.institutionPhone}}{{#if _metadata.institutionEmail}} &nbsp;·&nbsp; {{_metadata.institutionEmail}}{{/if}}</div>{{/if}}` +
      `{{#if _metadata.schoolYearName}}<div style="font-size:9px;color:#9ca3af;margin-top:2px;">Año Escolar {{_metadata.schoolYearName}}</div>{{/if}}` +
      `</div>`
  );

  // Helper para formatear fechas
  Handlebars.registerHelper("formatDate", function (date: string) {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  // Helper para formatear horas
  Handlebars.registerHelper("formatTime", function (time: string) {
    if (!time) return "";
    return time;
  });

  // Helper condicional (block helper)
  Handlebars.registerHelper("if_eq", function (this: any, a: any, b: any, options: any) {
    return a === b ? options.fn(this) : options.inverse(this);
  });

  // Helper para verificar si no es igual (para usar con unless)
  Handlebars.registerHelper("isNotEqual", function (a: any, b: any) {
    return a !== b;
  });

  // Helper para capitalizar
  Handlebars.registerHelper("capitalize", function (str: string) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Helper para saltos de línea
  Handlebars.registerHelper("nl2br", function (text: string) {
    if (!text) return "";
    return new Handlebars.SafeString(
      text.replace(/\n/g, "<br>").replace(/\r/g, "")
    );
  });

  helpersRegistered = true;
}

// Registrar automáticamente al importar el módulo
if (typeof window !== "undefined") {
  registerHandlebarsHelpers();
}

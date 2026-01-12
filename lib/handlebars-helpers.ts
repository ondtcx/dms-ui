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

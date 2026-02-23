import type { Job } from "../types";
import jsPDF from "jspdf";

export async function generatePdf(job: Job): Promise<void> {
  const fetchImageAsBase64 = async (
    url: string,
    makeBlack = false,
  ): Promise<string | null> => {
    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      if (makeBlack) {
        ctx.drawImage(img, 0, 0);
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = "#1e293b"; // slate-800, oscuro
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(img, 0, 0);
      }

      return canvas.toDataURL("image/png");
    } catch (e) {
      console.error("Error cargando imagen", e);
      return null;
    }
  };

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  const width = doc.internal.pageSize.getWidth();

  // Header Background
  doc.setFillColor(241, 245, 249); // slate-100 (gris claro)
  doc.rect(0, 0, width, 25, "F");

  // Title
  doc.setTextColor(15, 23, 42); // slate-900 (casi negro)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE DE MANTENIMIENTO", 15, 12);

  // Fetch and add Logo (convertido a negro)
  const logoBase64 = await fetchImageAsBase64("/logo.png", true);
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", width - 40, 3, 25, 20);
  }

  // Status
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105); // slate-600
  const statusText = "ESTADO: FINALIZADO";
  doc.text(statusText, 15, 18);

  // Body Setup
  doc.setTextColor(40, 40, 40);
  let y = 32;
  const colSize = width / 2;

  const addField = (
    label: string,
    value: string,
    xPos: number,
    isBadge = false,
  ) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(label.toUpperCase(), xPos, y);

    y += 5;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42); // slate-900

    if (isBadge) {
      doc.setFillColor(239, 246, 255); // blue-50
      doc.roundedRect(
        xPos - 2,
        y - 4,
        doc.getTextWidth(value) + 4,
        6,
        1,
        1,
        "F",
      );
      doc.setTextColor(37, 99, 235); // blue-600
    }

    doc.text(value || "N/A", xPos, y);
    y += 8;
  };

  // Row 1
  addField("ID de Tarea", job.id, 15);
  y -= 13;
  addField("Tipo de Trabajo", job.workType, colSize, true);

  // Row 2
  addField("Área / Ubicación", job.area, 15);
  y -= 13;
  const dateStr = new Date(job.finishedAt).toLocaleString("es-MX");
  addField("Fecha de Cierre", dateStr, colSize);

  // Row 3
  addField("Técnico Asignado", job.technicianName, 15);
  y -= 13;
  addField("Turno", job.shift, colSize);

  y += 2;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(15, y, width - 15, y);
  y += 8;

  // Description
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("DESCRIPCIÓN DEL TRABAJO REALIZADO", 15, y);
  y += 7;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85); // slate-700

  const descLines = doc.splitTextToSize(
    job.description || "Sin descripción.",
    width - 30,
  );
  doc.text(descLines, 15, y);
  y += descLines.length * 6 + 10;

  // Additional Comments
  if (job.additionalComments) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("COMENTARIOS ADICIONALES", 15, y);
    y += 7;

    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(71, 85, 105);
    const commLines = doc.splitTextToSize(job.additionalComments, width - 30);
    doc.text(commLines, 15, y);
    y += commLines.length * 6 + 15;
  }

  // Evidencia Fotográfica (Misma hoja)
  if (job.beforePhoto || job.afterPhoto) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("EVIDENCIA FOTOGRÁFICA", 15, y);
    y += 7;

    // Configuramos para pintar ambas fotos en paralelo si caben,
    // o más pequeñas para que entren en la misma página principal.
    const imgWidth = 85; // Ancho máximo de la imagen
    const imgHeight = 60; // Alto propuesto

    if (job.beforePhoto) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Antes:", 15, y);
      doc.addImage(
        job.beforePhoto,
        "JPEG",
        15,
        y + 2,
        imgWidth,
        imgHeight,
        undefined,
        "FAST",
      );
    }

    if (job.afterPhoto) {
      const xOffset = job.beforePhoto ? 15 + imgWidth + 10 : 15;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Después:", xOffset, y);
      doc.addImage(
        job.afterPhoto,
        "JPEG",
        xOffset,
        y + 2,
        imgWidth,
        imgHeight,
        undefined,
        "FAST",
      );
    }

    y += imgHeight + 10;
  }

  // Signature Block Header
  const sigHeight = 30;

  // Check if we need to add a page to fit the signature
  if (y + sigHeight > 270) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(15, y, width - 30, sigHeight, 3, 3, "FD");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("FIRMA DEL TÉCNICO", 20, y + 8);

  if (job.signature) {
    if (job.signature.startsWith("data:image/")) {
      doc.addImage(job.signature, "PNG", 18, y + 12, 60, 15);
    } else {
      doc.setFontSize(18);
      doc.setFont("times", "italic");
      doc.setTextColor(15, 23, 42);
      doc.text(job.signature, 20, y + 22);
    }
  } else {
    doc.setFontSize(12);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("(Sin firma)", 20, y + 20);
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generado el ${new Date().toLocaleString("es-MX")} - Diario de Turno App`,
    15,
    285,
  );

  doc.save(`Reporte_${job.id}.pdf`);
}

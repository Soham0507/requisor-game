import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import writeXlsxFile, { type Cell } from 'write-excel-file/browser'

export async function exportToExcel(filename: string, sheetName: string, rows: Record<string, unknown>[]) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  const data: Cell[][] = [
    columns.map((value) => ({ type: String, value })),
    ...rows.map((row) => columns.map((column): Cell => {
      const value = row[column]
      if (value == null) return {}
      if (typeof value === 'number') return { type: Number, value }
      if (typeof value === 'boolean') return { type: Boolean, value }
      if (value instanceof Date) return { type: Date, value, format: 'yyyy-mm-dd' }
      return { type: String, value: String(value) }
    })),
  ]
  await writeXlsxFile(data, { sheet: sheetName }).toFile(`${filename}.xlsx`)
}

export function exportToPdf(filename: string, title: string, columns: string[], rows: (string | number)[][]) {
  const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait' })
  doc.setFontSize(14)
  doc.text(title, 14, 15)
  doc.setFontSize(9)
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 21)
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 26,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 72, 143] },
  })
  doc.save(`${filename}.pdf`)
}

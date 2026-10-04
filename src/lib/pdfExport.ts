'use client'

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface PDFReportData {
  title: string
  barangayScope: string
  timeframe: string
  generatedBy: string
  generatedAt: string
  stats: {
    totalIncidents: number
    critical: number
    verified: number
    pending: number
    resolved: number
    clearanceRate: number
    activeHotspots: number
    avgTurnaroundHours: number
    personnelCount: number
    dominantHazard: string
  }
  typology: { name: string; count: number; percentage: number; severity: string }[]
  timeline: { date: string; reports: number; resolved: number }[]
  hotspots: {
    location: string
    barangay: string
    classification: string
    severity: string
    status: string
    team: string
  }[]
  recommendations: {
    title: string
    description: string
    priority: 'high' | 'medium' | 'positive'
  }[]
}

/**
 * Generates and downloads a designed, executive Public Health & Vector Surveillance PDF Report.
 */
export async function exportBarangayAnalyticsPDF(data: PDFReportData): Promise<void> {
  // Create an offscreen styled container
  const container = document.createElement('div')
  container.id = '__pdf_export_container__'
  container.style.position = 'fixed'
  container.style.top = '-10000px'
  container.style.left = '-10000px'
  container.style.width = '1000px'
  container.style.backgroundColor = '#ffffff'
  container.style.color = '#0f172a'
  container.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  container.style.padding = '36px 44px'
  container.style.boxSizing = 'border-box'
  container.style.zIndex = '-9999'

  const priorityBadge = (p: string) => {
    if (p === 'high') return '<span style="background-color:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;text-transform:uppercase;">Urgent Action</span>'
    if (p === 'medium') return '<span style="background-color:#fef3c7;color:#92400e;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;text-transform:uppercase;">Preventive</span>'
    return '<span style="background-color:#d1fae5;color:#065f46;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;text-transform:uppercase;">Benchmark</span>'
  }

  const statusBadge = (s: string) => {
    const lower = s.toLowerCase()
    if (lower === 'resolved' || lower === 'completed') {
      return '<span style="background-color:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">Resolved</span>'
    }
    if (lower === 'critical' || lower === 'high') {
      return '<span style="background-color:#fff1f2;color:#be123c;border:1px solid #fecdd3;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">Critical Risk</span>'
    }
    return '<span style="background-color:#f8fafc;color:#475569;border:1px solid #e2e8f0;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">Active / In Patrol</span>'
  }

  container.innerHTML = `
    <div style="width:100%;">
      <!-- Official Header -->
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 18px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <div style="width: 14px; height: 14px; background-color: #0891b2; border-radius: 4px;"></div>
            <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #0891b2;">AEDIFY • VECTOR SURVEILLANCE & EPIDEMIOLOGY</span>
          </div>
          <h1 style="font-size: 24px; font-weight: 900; color: #0f172a; margin: 0 0 4px 0; letter-spacing: -0.02em;">
            ${data.title}
          </h1>
          <p style="font-size: 13px; color: #475569; margin: 0; font-weight: 500;">
            Republic of the Philippines • City Health Office • Molo District Health Division
          </p>
        </div>

        <div style="text-align: right; font-size: 11px; color: #64748b; line-height: 1.5; background: #f8fafc; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0;">
          <div><strong style="color:#0f172a;">Target Scope:</strong> ${data.barangayScope}</div>
          <div><strong style="color:#0f172a;">Time Window:</strong> ${data.timeframe}</div>
          <div><strong style="color:#0f172a;">Generated:</strong> ${data.generatedAt}</div>
          <div><strong style="color:#0f172a;">Analyst:</strong> ${data.generatedBy}</div>
        </div>
      </div>

      <!-- Key KPI Metric Cards Grid -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px;">
        <div style="background-color: #0f172a; color: #ffffff; padding: 14px 16px; border-radius: 12px; border: 1px solid #1e293b;">
          <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Total Incidents</div>
          <div style="font-size: 26px; font-weight: 900; margin: 4px 0 2px 0;">${data.stats.totalIncidents}</div>
          <div style="font-size: 11px; color: #cbd5e1;">${data.stats.critical} Critical • ${data.stats.resolved} Cleared</div>
        </div>

        <div style="background-color: #f8fafc; padding: 14px 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em;">Clearance Rate</div>
          <div style="font-size: 26px; font-weight: 900; color: #047857; margin: 4px 0 2px 0;">${data.stats.clearanceRate}%</div>
          <div style="font-size: 11px; color: #64748b;">Containment velocity</div>
        </div>

        <div style="background-color: #f8fafc; padding: 14px 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em;">Active Hotspots</div>
          <div style="font-size: 26px; font-weight: 900; color: #b91c1c; margin: 4px 0 2px 0;">${data.stats.activeHotspots}</div>
          <div style="font-size: 11px; color: #64748b;">Requiring field action</div>
        </div>

        <div style="background-color: #f8fafc; padding: 14px 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em;">Avg. Turnaround</div>
          <div style="font-size: 26px; font-weight: 900; color: #0f172a; margin: 4px 0 2px 0;">${data.stats.avgTurnaroundHours}h</div>
          <div style="font-size: 11px; color: #64748b;">Report to abatement</div>
        </div>
      </div>

      <!-- Typology and Surveillance Dynamics Row -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px;">
        <!-- Typology Breakdown -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
          <h3 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.04em;">
            Breeding Site Typology & Risk Profile
          </h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${data.typology.map(t => `
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; margin-bottom: 3px;">
                  <span style="color: #1e293b;">${t.name}</span>
                  <span style="color: #64748b;">${t.count} sites (${t.percentage}%)</span>
                </div>
                <div style="height: 6px; width: 100%; background-color: #f1f5f9; border-radius: 999px; overflow: hidden;">
                  <div style="height: 100%; width: ${Math.max(t.percentage, 4)}%; background-color: ${t.severity === 'critical' ? '#ef4444' : '#0891b2'}; border-radius: 999px;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Strategic Highlights -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h3 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.04em;">
              Field Patrol & Vector Summary
            </h3>
            <div style="font-size: 12px; color: #334155; line-height: 1.6;">
              <p style="margin: 0 0 6px 0;">
                • <strong>Dominant Risk Factor:</strong> ${data.stats.dominantHazard} is the leading vector habitat across surveyed sectors.
              </p>
              <p style="margin: 0 0 6px 0;">
                • <strong>Deployment Force:</strong> ${data.stats.personnelCount} designated Tanod Patrol Units actively monitoring perimeter zones.
              </p>
              <p style="margin: 0;">
                • <strong>Surveillance Clearance:</strong> ${data.stats.resolved} of ${data.stats.totalIncidents} reported breeding locations have been successfully abated and verified clean.
              </p>
            </div>
          </div>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 12px; margin-top: 10px;">
            <div style="font-size: 11px; font-weight: 700; color: #166534;">Public Health Status:</div>
            <div style="font-size: 11px; color: #15803d;">
              ${data.stats.clearanceRate >= 70 ? 'Vector containment in active control; maintain routine larviciding cycles.' : 'Elevated risk accumulation; initiate scheduled community search-and-destroy cleanup.'}
            </div>
          </div>
        </div>
      </div>

      <!-- High Priority Hotspot Registry Table -->
      <div style="margin-bottom: 22px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #f8fafc; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-size: 12px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.04em;">
            Priority Hotspot Surveillance Registry (Sample Top Sites)
          </h3>
          <span style="font-size: 11px; color: #64748b; font-weight: 600;">Displaying top ${Math.min(data.hotspots.length, 6)} clusters</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 11px;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 700;">
              <th style="padding: 8px 12px;">Location / Sector</th>
              <th style="padding: 8px 12px;">Barangay</th>
              <th style="padding: 8px 12px;">Classification</th>
              <th style="padding: 8px 12px;">Assigned Team</th>
              <th style="padding: 8px 12px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.hotspots.slice(0, 6).map((h, i) => `
              <tr style="border-bottom: 1px solid #f1f5f9; background-color: ${i % 2 === 0 ? '#ffffff' : '#fafafa'};">
                <td style="padding: 8px 12px; font-weight: 700; color: #0f172a;">${h.location}</td>
                <td style="padding: 8px 12px; color: #475569;">${h.barangay}</td>
                <td style="padding: 8px 12px; color: #334155;">${h.classification}</td>
                <td style="padding: 8px 12px; color: #0891b2; font-weight: 600;">${h.team}</td>
                <td style="padding: 8px 12px;">${statusBadge(h.status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Actionable Health Recommendations Briefing -->
      <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 24px; background: #ffffff;">
        <h3 style="font-size: 12px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.04em;">
          Epidemiological Action Plan & Directives
        </h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${data.recommendations.map(r => `
            <div style="display: flex; align-items: flex-start; gap: 10px; font-size: 11px; line-height: 1.5; padding: 6px 0; border-bottom: 1px dashed #f1f5f9;">
              <div style="shrink: 0; margin-top: 2px;">${priorityBadge(r.priority)}</div>
              <div>
                <strong style="color: #0f172a;">${r.title}:</strong>
                <span style="color: #475569;"> ${r.description}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Sign-off Certification Footer -->
      <div style="border-top: 1px solid #cbd5e1; padding-top: 18px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; text-align: center; font-size: 11px;">
        <div>
          <div style="height: 36px; border-bottom: 1px solid #94a3b8; margin-bottom: 6px;"></div>
          <div style="font-weight: 700; color: #0f172a;">Barangay Sanitation Officer</div>
          <div style="color: #64748b; font-size: 10px;">Field Operations Unit</div>
        </div>

        <div>
          <div style="height: 36px; border-bottom: 1px solid #94a3b8; margin-bottom: 6px;"></div>
          <div style="font-weight: 700; color: #0f172a;">City Health Surveillance Focal</div>
          <div style="color: #64748b; font-size: 10px;">Epidemiology & Surveillance Division</div>
        </div>

        <div>
          <div style="height: 36px; border-bottom: 1px solid #94a3b8; margin-bottom: 6px;"></div>
          <div style="font-weight: 700; color: #0f172a;">Barangay Captain / Punong Barangay</div>
          <div style="color: #64748b; font-size: 10px;">Local Government Oversight</div>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height
    const ratio = canvasWidth / canvasHeight

    const imgHeight = pdfWidth / ratio

    if (imgHeight <= pdfHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight)
    } else {
      let position = 0
      let remainingHeight = imgHeight

      while (remainingHeight > 0) {
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
        remainingHeight -= pdfHeight
        position -= pdfHeight
        if (remainingHeight > 0) {
          pdf.addPage()
        }
      }
    }

    const cleanName = (data.barangayScope.replace(/[^a-zA-Z0-9]/g, '_') || 'Barangay').replace(/_+/g, '_')
    const dateStamp = new Date().toISOString().slice(0, 10)
    pdf.save(`Aedify_Surveillance_${cleanName}_${dateStamp}.pdf`)
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container)
    }
  }
}

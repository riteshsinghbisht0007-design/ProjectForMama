import jsPDF from 'jspdf';
import { Summon, WitnessPerson } from '../types';

export interface GeneratePdfOptions {
  witness?: WitnessPerson | null;
  officerName?: string;
  badgeNumber?: string;
}

/**
 * Generates an authentic, high-resolution official Judicial Notice / Summon Notice PDF
 * compliant with Delhi Police and Court Service standards.
 */
export const generateSummonNoticePDF = async (
  summon: Summon,
  options?: GeneratePdfOptions
): Promise<{ doc: jsPDF; filename: string; blobUrl: string }> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  // 1. Double Border Frame (Official Legal Notice Border)
  doc.setDrawColor(30, 41, 59); // dark slate
  doc.setLineWidth(0.8);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // 2. Header: Department Seal / Heading
  doc.setFillColor(11, 19, 38); // Deep Police Navy
  doc.rect(10, 10, pageWidth - 20, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('DELHI POLICE • JUDICIAL SUMMONS WING', pageWidth / 2, 19, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(173, 200, 245);
  doc.text(
    `POLICE STATION: ${summon.policeStation.toUpperCase()} • DISTRICT: ${summon.district.toUpperCase()} • DELHI NCT`,
    pageWidth / 2,
    25,
    { align: 'center' }
  );

  doc.setFontSize(7.5);
  doc.setTextColor(255, 183, 125);
  doc.text('ISSUED UNDER SECTION 61 / 62 Cr.P.C. / BNSS 2023', pageWidth / 2, 30, { align: 'center' });

  cursorY = 40;

  // 3. Document Title & Docket Status Badge
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('OFFICIAL JUDICIAL NOTICE & COURT SUMMONS', margin, cursorY);

  // Urgency / Status Tag
  const urgencyText = `URGENCY: ${summon.urgency.toUpperCase()}`;
  doc.setFontSize(8.5);
  if (summon.urgency === 'Urgent') {
    doc.setFillColor(254, 226, 226);
    doc.setTextColor(185, 28, 28);
    doc.rect(pageWidth - margin - 36, cursorY - 4.5, 36, 6, 'F');
    doc.text(urgencyText, pageWidth - margin - 18, cursorY, { align: 'center' });
  } else {
    doc.setFillColor(238, 242, 255);
    doc.setTextColor(49, 46, 129);
    doc.rect(pageWidth - margin - 36, cursorY - 4.5, 36, 6, 'F');
    doc.text(urgencyText, pageWidth - margin - 18, cursorY, { align: 'center' });
  }

  cursorY += 8;

  // 4. Case Metadata Box (Two-column layout)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, cursorY, contentWidth, 24, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  // Left column
  doc.text('Summon / Warrant Ref:', margin + 4, cursorY + 6);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(summon.summonNumber || 'N/A', margin + 48, cursorY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('FIR / Case Number:', margin + 4, cursorY + 12);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(summon.caseNumber || 'N/A', margin + 48, cursorY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Issue / Dispatch Date:', margin + 4, cursorY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(summon.issueDate || new Date().toISOString().split('T')[0], margin + 48, cursorY + 18);

  // Right column
  const midX = margin + contentWidth / 2 + 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Court / Bench:', midX, cursorY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const courtLine = doc.splitTextToSize(summon.courtName || 'Court of Competent Jurisdiction', 55);
  doc.text(courtLine, midX + 28, cursorY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Hearing Date:', midX, cursorY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text(summon.hearingDate || 'Scheduled Appearance', midX + 28, cursorY + 18);

  cursorY += 30;

  // 5. Subject / Respondent Particulars Section
  doc.setFillColor(30, 58, 95);
  doc.rect(margin, cursorY, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1. ACCUSED / RESPONDENT / CITIZEN PARTICULARS', margin + 4, cursorY + 4.8);

  cursorY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('Full Legal Name:', margin + 4, cursorY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(summon.personName, margin + 40, cursorY);

  if (summon.fatherName) {
    cursorY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Son/Daughter/Wife of:', margin + 4, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(summon.fatherName, margin + 40, cursorY);
  }

  cursorY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Registered Address:', margin + 4, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const addrLines = doc.splitTextToSize(summon.address || 'Address on record', contentWidth - 44);
  doc.text(addrLines, margin + 40, cursorY);
  cursorY += addrLines.length * 4.5 + 2;

  // 6. Judicial Court Room & Charges Section
  doc.setFillColor(30, 58, 95);
  doc.rect(margin, cursorY, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('2. JUDICIAL PROCEEDINGS & CHARGES', margin + 4, cursorY + 4.8);

  cursorY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Court Complex:', margin + 4, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${summon.courtName} — ${summon.courtAddress || summon.district}`, margin + 40, cursorY);

  cursorY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Section / Charges:', margin + 4, cursorY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  const chargeLines = doc.splitTextToSize(
    summon.offenseCharges || 'Section 61 CrPC / Relevant provisions of Indian Penal Code',
    contentWidth - 44
  );
  doc.text(chargeLines, margin + 40, cursorY);
  cursorY += chargeLines.length * 4.5 + 2;

  // 7. Witness Particulars (if present in options or summon)
  const activeWitness = options?.witness || summon.witnesses?.[0];
  if (activeWitness) {
    doc.setFillColor(30, 58, 95);
    doc.rect(margin, cursorY, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`3. WITNESS / SERVICE ACKNOWLEDGMENT RECORD (${activeWitness.role.toUpperCase()})`, margin + 4, cursorY + 4.8);

    cursorY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Witness Name:', margin + 4, cursorY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(activeWitness.name, margin + 40, cursorY);

    if (activeWitness.phone) {
      cursorY += 6;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('Contact Phone:', margin + 4, cursorY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(activeWitness.phone, margin + 40, cursorY);
    }

    if (activeWitness.idProofNumber) {
      cursorY += 6;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(`ID Proof (${activeWitness.idProofType || 'Govt ID'}):`, margin + 4, cursorY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(activeWitness.idProofNumber, margin + 40, cursorY);
    }

    cursorY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Witness Address:', margin + 4, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const witAddrLines = doc.splitTextToSize(activeWitness.address || 'Address verified by field officer', contentWidth - 44);
    doc.text(witAddrLines, margin + 40, cursorY);
    cursorY += witAddrLines.length * 4.5 + 2;

    if (activeWitness.statementSummary) {
      cursorY += 2;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('Statement / Note:', margin + 4, cursorY);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(71, 85, 105);
      const stLines = doc.splitTextToSize(`"${activeWitness.statementSummary}"`, contentWidth - 44);
      doc.text(stLines, margin + 40, cursorY);
      cursorY += stLines.length * 4.5 + 2;
    }
  }

  // 8. Official Statutory Warning Box
  cursorY += 4;
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(248, 113, 113);
  doc.rect(margin, cursorY, contentWidth, 18, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27);
  doc.text('MANDATORY LEGAL APPEARANCE WARNING:', margin + 4, cursorY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(127, 29, 29);
  const warnText =
    'You are hereby commanded in the name of the Court to appear in person before the Presiding Magistrate on the specified hearing date and time without fail. Failure to attend will result in the issuance of a Bailable / Non-Bailable Warrant (NBW) under Cr.P.C. / B.N.S.S.';
  const warnLines = doc.splitTextToSize(warnText, contentWidth - 8);
  doc.text(warnLines, margin + 4, cursorY + 9);

  // 9. Signature and Stamp Blocks at bottom
  const signY = pageHeight - 34;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(margin + 6, signY, margin + 60, signY);
  doc.line(pageWidth - margin - 66, signY, pageWidth - margin - 12, signY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Serving Police Officer', margin + 33, signY + 4, { align: 'center' });
  doc.text('Recipient / Witness Signature', pageWidth - margin - 39, signY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const offText = options?.officerName ? `${options.officerName} (${options.badgeNumber || 'Delhi Police'})` : summon.policeStation;
  doc.text(offText, margin + 33, signY + 8, { align: 'center' });
  doc.text('Left Thumb Impression / Sign', pageWidth - margin - 39, signY + 8, { align: 'center' });

  // 10. Footer Security String
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const genStamp = `DIGITAL VERIFICATION REF: DP-SM-${summon.id.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  doc.text(genStamp, pageWidth / 2, pageHeight - 12, { align: 'center' });

  // Output preparation
  const cleanSummonNo = (summon.summonNumber || 'WARRANT').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Summon_${cleanSummonNo}_Official_Legal_Notice.pdf`;
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  return { doc, filename, blobUrl };
};

/**
 * Convenience helper to download the generated PDF directly in the browser.
 */
export const downloadSummonNoticePDF = async (
  summon: Summon,
  options?: GeneratePdfOptions
): Promise<string> => {
  const { doc, filename } = await generateSummonNoticePDF(summon, options);
  doc.save(filename);
  return filename;
};

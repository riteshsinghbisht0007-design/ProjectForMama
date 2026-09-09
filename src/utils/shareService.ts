import { Summon, WitnessPerson } from '../types';

export const generateWitnessForwardText = (witness: WitnessPerson, summon?: Summon | null): string => {
  return `🏛️ DELHI POLICE — OFFICIAL WITNESS / SERVICE DISPATCH
[JUDICIAL PROCESS SERVING UNIT • ${witness.policeStation?.toUpperCase() || 'DELHI'}]

👤 WITNESS / PERSON PARTICULARS:
• Full Name: ${witness.name}
${witness.fatherName ? `• Relative / Father's Name: ${witness.fatherName}\n` : ''}• Role in Proceedings: ${witness.role.toUpperCase()}
• Contact Phone: ${witness.phone || 'Not Provided'}
${witness.idProofNumber ? `• Identity Proof: ${witness.idProofType || 'Govt ID'} (${witness.idProofNumber})\n` : ''}
📍 RESIDENTIAL / SERVING ADDRESS:
${witness.address}
Jurisdiction: ${witness.policeStation}, ${witness.district}${witness.state ? `, ${witness.state}` : ''}

${summon ? `📋 ASSOCIATED CASE / SUMMON:
• Case / FIR No: ${summon.caseNumber}
• Summon Ref: ${summon.summonNumber}
• Court / Bench: ${summon.courtName}
• Scheduled Hearing: ${summon.hearingDate}
` : witness.summonCaseNo ? `📋 LINKED CASE REF: ${witness.summonCaseNo}\n` : ''}
${witness.statementSummary ? `📝 STATEMENT / WITNESS REMARKS:\n"${witness.statementSummary}"\n` : ''}
⚠️ Verified by Delhi Police Summon Mitra System
Generated on: ${new Date().toLocaleDateString('en-IN')}`;
};

export const shareWitnessNative = async (witness: WitnessPerson, summon?: Summon | null): Promise<boolean> => {
  const text = generateWitnessForwardText(witness, summon);

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Witness Record - ${witness.name} (${witness.role})`,
        text,
      });
      return true;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native share error:', err);
      }
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const generateFormattedForwardText = (summon: Summon): string => {
  return `🏛️ OFFICIAL JUDICIAL SUMMON NOTICE 🏛️
[DEPARTMENT OF POLICE - COURT LIAISON CELL]

📋 SUMMON DETAILS:
• Summon No: ${summon.summonNumber}
• Case / FIR No: ${summon.caseNumber}
• Under Sections: ${summon.offenseCharges || 'Not Specified'}

👤 PERSON SUMMONED:
• Name: ${summon.personName}
${summon.fatherName ? `• Father/Guardian: ${summon.fatherName}\n` : ''}
📍 COMPLETE RESIDENTIAL / SERVING ADDRESS:
${summon.address}
Jurisdiction: ${summon.policeStation}, ${summon.district}, ${summon.state}

⚖️ JUDICIAL HEARING:
• Court: ${summon.courtName}
• Court Complex / Room: ${summon.courtAddress}
• Date of Appearance: ${summon.hearingDate}
• Issuing Authority: ${summon.issuingAuthority || 'Judicial Magistrate'}

⚠️ Status: ${summon.status.toUpperCase()}
Generated via Summons Mitra Law Enforcement Assistant.`;
};

// Generates the official split-view share card:
// Left Side: Summon Document / Image
// Right Side: Extracted Critical Judicial Fields & Official Police Seals
export const generateSplitSummonCanvas = async (summon: Summon): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 700;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve('');
      return;
    }

    // Background
    ctx.fillStyle = '#0B1326';
    ctx.fillRect(0, 0, 1200, 700);

    // Top Header Banner
    ctx.fillStyle = '#0A192F';
    ctx.fillRect(0, 0, 1200, 70);
    ctx.fillStyle = '#222A3D';
    ctx.fillRect(0, 68, 1200, 2);

    // Header Text
    ctx.fillStyle = '#DAE2FD';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillText('SUMMONS MITRA • OFFICIAL JUDICIAL NOTICE DISPATCH', 40, 42);

    ctx.fillStyle = '#FFB77D';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.fillText(`STATUS: ${summon.status.toUpperCase()}`, 1020, 42);

    // Split Divider Line
    ctx.fillStyle = '#222A3D';
    ctx.fillRect(570, 70, 2, 630);

    // RIGHT SIDE: Extracted details
    const drawDetails = () => {
      const startX = 605;
      let currY = 115;

      // Section tag
      ctx.fillStyle = '#2F4A70';
      ctx.beginPath();
      ctx.roundRect(startX, currY - 20, 140, 26, 4);
      ctx.fill();
      ctx.fillStyle = '#ADC8F5';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText('JUDICIAL DOCKET', startX + 10, currY - 3);

      currY += 30;

      // Summon & FIR
      ctx.fillStyle = '#8F9097';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('SUMMON NUMBER', startX, currY);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.fillText(summon.summonNumber, startX, currY + 22);

      ctx.fillStyle = '#8F9097';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('CASE / FIR NUMBER', startX + 280, currY);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.fillText(summon.caseNumber, startX + 280, currY + 22);

      currY += 55;

      // Respondent Name
      ctx.fillStyle = '#8F9097';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('PERSON / RESPONDENT SUMMONED', startX, currY);
      ctx.fillStyle = '#DAE2FD';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.fillText(summon.personName, startX, currY + 24);

      if (summon.fatherName) {
        ctx.fillStyle = '#C5C6CD';
        ctx.font = '13px Inter, sans-serif';
        ctx.fillText(`S/O or D/O: ${summon.fatherName}`, startX, currY + 44);
        currY += 60;
      } else {
        currY += 45;
      }

      // Address Box (Crucial Highlight)
      ctx.fillStyle = '#131B2E';
      ctx.strokeStyle = '#39475F';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(startX, currY, 550, 95, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFB77D';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText('📍 COMPLETE DELIVERY ADDRESS', startX + 15, currY + 22);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '13px Inter, sans-serif';
      // Multi-line address wrap
      const words = summon.address.split(' ');
      let line1 = '';
      let line2 = '';
      for (const w of words) {
        if ((line1 + ' ' + w).length < 65) line1 += (line1 ? ' ' : '') + w;
        else line2 += (line2 ? ' ' : '') + w;
      }
      ctx.fillText(line1, startX + 15, currY + 45);
      if (line2) ctx.fillText(line2, startX + 15, currY + 65);
      ctx.fillStyle = '#C5C6CD';
      ctx.fillText(`Jurisdiction: ${summon.policeStation}, ${summon.district}`, startX + 15, currY + 84);

      currY += 115;

      // Court and Hearing Date
      ctx.fillStyle = '#8F9097';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('COURT & BENCH', startX, currY);
      ctx.fillStyle = '#DAE2FD';
      ctx.font = 'bold 15px Inter, sans-serif';
      ctx.fillText(summon.courtName, startX, currY + 20);
      ctx.fillStyle = '#8F9097';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(summon.courtAddress, startX, currY + 38);

      currY += 58;

      // Hearing Date Badge
      ctx.fillStyle = '#2B1300';
      ctx.strokeStyle = '#FFB77D';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(startX, currY, 260, 48, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFB77D';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText('COURT HEARING DATE', startX + 15, currY + 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillText(summon.hearingDate, startX + 15, currY + 38);

      // Issuing Authority
      ctx.fillStyle = '#8F9097';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('ISSUING AUTHORITY', startX + 280, currY + 12);
      ctx.fillStyle = '#DAE2FD';
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText(summon.issuingAuthority || 'Judicial Magistrate', startX + 280, currY + 32);

      // Bottom footer watermark
      ctx.fillStyle = '#44474D';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(
        'Verified Official Police Liaison Dispatch • Tamper-Evident Record',
        startX,
        680
      );
    };

    // LEFT SIDE: Summon Image / Scan
    if (summon.imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Draw document image fitted into left box (530 x 600)
        const targetX = 30;
        const targetY = 90;
        const targetW = 510;
        const targetH = 580;

        ctx.fillStyle = '#171F33';
        ctx.fillRect(targetX, targetY, targetW, targetH);

        // Aspect fit
        const scale = Math.min(targetW / img.width, targetH / img.height);
        const nw = img.width * scale;
        const nh = img.height * scale;
        const nx = targetX + (targetW - nw) / 2;
        const ny = targetY + (targetH - nh) / 2;

        ctx.drawImage(img, nx, ny, nw, nh);

        // Border around document
        ctx.strokeStyle = '#39475F';
        ctx.lineWidth = 1;
        ctx.strokeRect(targetX, targetY, targetW, targetH);

        drawDetails();
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        renderPlaceholderLeft();
        drawDetails();
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = summon.imageUrl;
    } else {
      renderPlaceholderLeft();
      drawDetails();
      resolve(canvas.toDataURL('image/png'));
    }

    function renderPlaceholderLeft() {
      if (!ctx) return;
      const targetX = 30;
      const targetY = 90;
      const targetW = 510;
      const targetH = 580;

      ctx.fillStyle = '#131B2E';
      ctx.fillRect(targetX, targetY, targetW, targetH);
      ctx.strokeStyle = '#222A3D';
      ctx.lineWidth = 2;
      ctx.strokeRect(targetX, targetY, targetW, targetH);

      ctx.fillStyle = '#39475F';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ORIGINAL SUMMON / WARRANT DOCUMENT', targetX + targetW / 2, targetY + targetH / 2 - 20);
      ctx.font = '13px Inter, sans-serif';
      ctx.fillStyle = '#8F9097';
      ctx.fillText(`Summon Reference: ${summon.summonNumber}`, targetX + targetW / 2, targetY + targetH / 2 + 10);
      ctx.fillText(`Police Station: ${summon.policeStation}`, targetX + targetW / 2, targetY + targetH / 2 + 30);
      ctx.textAlign = 'start';
    }
  });
};

export const shareSummonNative = async (summon: Summon, splitImageUrl?: string): Promise<boolean> => {
  const text = generateFormattedForwardText(summon);

  if (navigator.share) {
    try {
      if (splitImageUrl && navigator.canShare) {
        const blob = await (await fetch(splitImageUrl)).blob();
        const file = new File([blob], `Summon_${summon.summonNumber.replace(/[^a-zA-Z0-9]/g, '_')}.png`, {
          type: 'image/png',
        });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Summon Notice - ${summon.personName} (${summon.caseNumber})`,
            text,
            files: [file],
          });
          return true;
        }
      }

      await navigator.share({
        title: `Summon Notice - ${summon.personName} (${summon.caseNumber})`,
        text,
      });
      return true;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native share error:', err);
      }
    }
  }

  // Fallback: Copy formatted text to clipboard
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

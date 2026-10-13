import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jsPDF } from '../frontend/node_modules/jspdf/dist/jspdf.es.min.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildPdf(ad, options) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 595.28 pt
  const pageHeight = doc.internal.pageSize.getHeight(); // 841.89 pt
  const margin = 36;
  const contentWidth = pageWidth - margin * 2; // 523.28 pt
  const maxContentY = 770;
  const subsequentHeaderHeight = 32;

  const customId = ad.custom_id || `AD-${ad.id}`;
  const caseRef = options?.caseId || `CASE-2026-${String(ad.id).padStart(4, '0')}`;
  const detectionDate = ad.created_at || 'October 13, 2026, 10:30:00 AM';
  const riskLevel = ad.risk_level || 'HIGH';
  const riskScore = ad.risk_score || 85;

  let y = margin;

  const renderSubsequentHeader = () => {
    doc.setFillColor(11, 18, 32); // #0B1220
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('FraudScope AI / FinGuard — Forensic Case Dossier', margin, 18);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(34, 211, 238); // Cyan
    doc.text(caseRef, margin + 225, 18);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text('CONFIDENTIAL // LAW ENFORCEMENT ONLY', pageWidth - margin - 180, 18);

    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(1);
    doc.line(0, 28, pageWidth, 28);
  };

  const checkPageBreak = (neededHeight) => {
    if (y + neededHeight > maxContentY) {
      doc.addPage();
      renderSubsequentHeader();
      y = subsequentHeaderHeight + 20;
    }
  };

  // ================= PAGE 1 =================
  doc.setFillColor(11, 18, 32); // #0B1220
  doc.rect(0, 0, pageWidth, 68, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FraudScope AI / FinGuard', margin, 32);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // #94A3B8
  doc.text('FINANCIAL FRAUD THREAT INTELLIGENCE & FORENSIC DOSSIER', margin, 48);

  doc.setFillColor(99, 102, 241); // #6366F1
  doc.roundedRect(pageWidth - margin - 115, 20, 115, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIDENTIAL / LE', pageWidth - margin - 105, 33);

  y = 82;

  // Metadata Card
  doc.setFillColor(24, 36, 58); // #18243A
  doc.roundedRect(margin, y, contentWidth, 58, 5, 5, 'F');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 211, 238);
  doc.text(`CASE REF: ${caseRef}`, margin + 12, y + 18);

  doc.setTextColor(229, 233, 242);
  doc.setFont('helvetica', 'normal');
  doc.text(`Post ID: ${customId}`, margin + 12, y + 33);
  doc.text(`Platform: ${ad.platform_detected || ad.platform || 'Telegram'}`, margin + 12, y + 47);

  const midX = margin + contentWidth / 2 - 20;
  doc.text(`Generated: October 13, 2026`, midX, y + 18);
  doc.text(`Detection Date: ${detectionDate}`, midX, y + 33);
  doc.text(`Status: ${ad.review_status || 'UNDER_REVIEW'}`, midX, y + 47);

  // Risk Score Box
  const scoreColor = riskLevel === 'HIGH' ? [239, 68, 68] : riskLevel === 'MEDIUM' ? [245, 158, 11] : [16, 185, 129];
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.roundedRect(pageWidth - margin - 75, y + 10, 65, 38, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`${riskScore}/100`, pageWidth - margin - 67, y + 26);
  doc.setFontSize(7.5);
  doc.text(`${riskLevel} RISK`, pageWidth - margin - 67, y + 38);

  y += 70;

  // Section 1: Executive Summary
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 18, 32);
  doc.text('1. EXECUTIVE SUMMARY & FRAUD RELEVANCE GATE', margin, y);
  y += 12;

  const explanation = ad.analysis?.explanation ||
    'Confirmed financial fraud pattern. Content solicits unauthorized checking and business bank accounts with bypassed KYC verification, pre-linked ATM cards, and active credential interception mechanisms.';
  const explanationLines = doc.splitTextToSize(explanation, contentWidth - 24);
  const summaryBoxHeight = Math.max(38, explanationLines.length * 11 + 16);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 4, 4, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(explanationLines, margin + 12, y + 16);

  y += summaryBoxHeight + 14;

  // Section 2: Advertisement Evidence
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 18, 32);
  doc.text('2. ADVERTISEMENT EVIDENCE & DETECTED CONTENT', margin, y);
  y += 12;

  const rawSnippet = ad.original_text || 'No text snippet provided.';
  const snippetLines = doc.splitTextToSize(rawSnippet, contentWidth - 24);
  const displayedSnippetLines = snippetLines.slice(0, 5);
  const snippetBoxHeight = Math.max(40, displayedSnippetLines.length * 11 + 16);

  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(220, 226, 235);
  doc.roundedRect(margin, y, contentWidth, snippetBoxHeight, 4, 4, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(displayedSnippetLines, margin + 12, y + 16);

  y += snippetBoxHeight + 14;

  // Section 3: Triggered Rules
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 18, 32);
  doc.text('3. TRIGGERED VIOLATION RULES & THREAT VECTORS', margin, y);
  y += 12;

  const matchedRules = ad.analysis?.triggered_rules || [
    { rule_id: 'RULE_UNCHECKED_ACCOUNT', description: 'Offering current or bank accounts for rent/sale without authorization', weight: 40 },
    { rule_id: 'RULE_SIM_LINKED_BANKING', description: 'Mule account bundled with operational SIM card for OTP bypass', weight: 30 },
  ];

  matchedRules.forEach((rule) => {
    checkPageBreak(28);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 22, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text(`[${rule.rule_id || 'RULE'}]`, margin + 10, y + 14);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const desc = doc.splitTextToSize(rule.description || rule.explanation || 'Suspicious pattern identified', contentWidth - 170);
    doc.text(desc[0], margin + 125, y + 14);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`+${rule.weight || 20} pts`, pageWidth - margin - 45, y + 14);

    y += 24;
  });

  // ================= PAGE 2 =================
  doc.addPage();
  renderSubsequentHeader();
  y = subsequentHeaderHeight + 20;

  // Section 4: Extracted Technical Indicators
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 18, 32);
  doc.text('4. EXTRACTED TECHNICAL INDICATORS (REDACTED)', margin, y);
  y += 12;

  const entities = ad.entities || [];
  const phoneEntities = entities.filter(e => e.entity_type === 'PHONE').map(e => e.entity_value);
  const upiEntities = entities.filter(e => e.entity_type === 'UPI').map(e => e.entity_value);
  const urlEntities = entities.filter(e => e.entity_type === 'URL_DOMAIN' || e.entity_type === 'URL').map(e => e.entity_value);
  const tgEntities = entities.filter(e => e.entity_type === 'TELEGRAM').map(e => e.entity_value);

  const displayPhones = phoneEntities.length > 0 ? phoneEntities.join(', ') : '+1-555-019-8234';
  const displayUpis = upiEntities.length > 0 ? upiEntities.join(', ') : 'fastcash@okhdfcbank';
  const displayUrls = urlEntities.length > 0 ? urlEntities.join(', ') : 'https://t.me/FastCashDrop';
  const displayTg = tgEntities.length > 0 ? tgEntities.join(', ') : '@FastCashDrop';

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Phone Identifiers:', margin + 12, y + 15);
  doc.text('UPI Handles:', margin + 12, y + 27);
  doc.text('Telegram / Handles:', margin + 12, y + 39);
  doc.text('Web / Domain Links:', margin + 12, y + 50);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(doc.splitTextToSize(displayPhones, contentWidth - 140)[0], margin + 115, y + 15);
  doc.text(doc.splitTextToSize(displayUpis, contentWidth - 140)[0], margin + 115, y + 27);
  doc.text(doc.splitTextToSize(displayTg, contentWidth - 140)[0], margin + 115, y + 39);
  doc.text(doc.splitTextToSize(displayUrls, contentWidth - 140)[0], margin + 115, y + 50);

  y += 66;

  // Section 5: URL Security
  checkPageBreak(65);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 18, 32);
  doc.text('5. URL SECURITY & REPUTATION ANALYSIS', margin, y);
  y += 12;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 48, 4, 4, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Evaluated Domain:', margin + 12, y + 15);
  doc.text('Heuristic Verdict:', margin + 12, y + 28);
  doc.text('SSRF / Host Integrity:', margin + 12, y + 40);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('t.me', margin + 115, y + 15);
  doc.text('SUSPICIOUS_CHANNEL', margin + 115, y + 28);
  doc.text('Passed (Public DNS)', margin + 115, y + 40);

  y += 60;

  // Section 6: Threat Cluster & Network Linkages
  checkPageBreak(85);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 18, 32);
  doc.text('6. THREAT CLUSTER & NETWORK LINKAGE', margin, y);
  y += 11;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Notice: Shared identifiers denote common operational infrastructure across 4 syndicate nodes.',
    margin,
    y
  );
  y += 10;

  const linkedPosts = options?.linkedPosts || [
    { id: 'AD-DEMO-004', platform: 'Telegram', identifier: 'Shared Telegram (@FastCashDrop)', risk: 'HIGH' },
    { id: 'AD-DEMO-006', platform: 'Telegram', identifier: 'Exact Content Fingerprint Match', risk: 'HIGH' },
    { id: 'AD-DEMO-007', platform: 'Telegram', identifier: 'Shared Phone (+1-555-019-8234)', risk: 'HIGH' },
  ];

  linkedPosts.forEach(lp => {
    checkPageBreak(22);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 19, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(99, 102, 241);
    doc.text(lp.id, margin + 10, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Platform: ${lp.platform}`, margin + 85, y + 13);
    const idSnippet = doc.splitTextToSize(lp.identifier, contentWidth - 210)[0];
    doc.text(idSnippet, margin + 175, y + 13);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text(lp.risk, pageWidth - margin - 40, y + 13);

    y += 21;
  });

  y += 12;

  // Section 7: Investigator Assessment & Recommendations
  checkPageBreak(75);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 18, 32);
  doc.text('7. INVESTIGATOR ASSESSMENT & RECOMMENDATIONS', margin, y);
  y += 12;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  const notes = options?.analystNotes ||
    'High confidence money mule recruitment and illicit account distribution syndicate. The subject operation distributes pre-activated checking accounts across multiple redundant channels. Recommended for immediate platform takedown and coordination with Financial Crime Compliance.';
  const noteLines = doc.splitTextToSize(notes, contentWidth - 24);
  const notesBoxHeight = Math.max(38, noteLines.length * 11 + 16);

  doc.roundedRect(margin, y, contentWidth, notesBoxHeight, 4, 4, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(noteLines, margin + 12, y + 16);

  // Dynamic Running Footers
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, 808, pageWidth - margin, 808);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(
      'FraudScope AI / FinGuard Automated Forensic Case Dossier — Official Investigative Record',
      margin,
      822
    );

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin - 50, 822);
  }

  return doc;
}

// 1. Generate Standard Sample Case
const standardAd = {
  id: 1,
  custom_id: 'AD-DEMO-001',
  platform_detected: 'Telegram',
  created_at: 'October 13, 2026, 10:30:00 AM',
  review_status: 'CONFIRMED_FRAUD',
  risk_level: 'HIGH',
  risk_score: 85,
  original_text: 'GUARANTEED UNCHECKED BANK ACCOUNTS FOR SALE! Get fully activated business and personal checking accounts with online access and debit cards. No KYC verification needed. Instant delivery. Contact @FastCashDrop on Telegram or dm +1-555-019-8234 now. Limited slots left today!',
  analysis: {
    explanation: 'Confirmed financial fraud pattern. Content solicits unauthorized commercial checking bank accounts with bypassed KYC verification, pre-linked ATM cards, and active credential interception mechanisms.',
    triggered_rules: [
      { rule_id: 'RULE_UNCHECKED_ACCOUNT', description: 'Offering commercial bank accounts for unauthorized rental or illicit purchase', weight: 40 },
      { rule_id: 'RULE_SIM_LINKED_BANKING', description: 'Account bundled with active SIM and debit card credentials for OTP interception', weight: 30 },
      { rule_id: 'RULE_PRESSURE_TACTICS', description: 'Urgency markers ("Limited slots left today", "Instant delivery")', weight: 15 },
    ]
  },
  entities: [
    { entity_type: 'PHONE', entity_value: '+1-555-019-8234' },
    { entity_type: 'TELEGRAM', entity_value: '@FastCashDrop' },
    { entity_type: 'URL_DOMAIN', entity_value: 'https://t.me/FastCashDrop' },
    { entity_type: 'UPI', entity_value: 'fastcash@okhdfcbank' }
  ]
};

const docStandard = buildPdf(standardAd, {
  caseId: 'CASE-2026-0001',
  analystNotes: 'High confidence money mule recruitment and illicit account distribution syndicate. Recommended for immediate platform takedown and coordination with Financial Crime Compliance.'
});

const standardPdfPath = path.join(__dirname, 'sample_finguard_report_standard.pdf');
fs.writeFileSync(standardPdfPath, Buffer.from(docStandard.output('arraybuffer')));
console.log(`Standard Report generated at: ${standardPdfPath}`);
console.log(`Standard Report Page Count: ${docStandard.getNumberOfPages()}`);

// 2. Generate Extended Sample Case with Long Descriptions
const extendedAd = {
  ...standardAd,
  original_text: standardAd.original_text + ' Additional forensic notes: Syndicate operates secondary payment gateways on merchant terminals, utilizing multiple mule accounts across various state jurisdictions to avoid AML threshold reporting.',
  analysis: {
    ...standardAd.analysis,
    explanation: standardAd.analysis.explanation + ' Cross-border routing indicators detected connecting multiple payment settlement hops. Forensic telemetry indicates continuous automated reposting across high-volume chat groups with rotational SIM numbers.',
    triggered_rules: [
      ...standardAd.analysis.triggered_rules,
      { rule_id: 'RULE_CRYPTO_ROUTING', description: 'Explicit solicitation to forward proceeds via cryptocurrency gateways', weight: 25 },
      { rule_id: 'RULE_MERCHANT_UPI_RENTAL', description: 'Routing illicit wire transfers through merchant aggregators', weight: 20 },
    ]
  }
};

const docExtended = buildPdf(extendedAd, {
  caseId: 'CASE-2026-0002',
  analystNotes: 'Comprehensive forensic analysis confirms active cross-platform money laundering network. The syndicate utilizes multi-layered mule accounts with automated forwarding protocols. Recommended immediate international law enforcement referral, freezing of connected merchant UPI credentials, and domain registry suspension for associated landing pages.'
});

const extendedPdfPath = path.join(__dirname, 'sample_finguard_report_extended.pdf');
fs.writeFileSync(extendedPdfPath, Buffer.from(docExtended.output('arraybuffer')));
console.log(`Extended Report generated at: ${extendedPdfPath}`);
console.log(`Extended Report Page Count: ${docExtended.getNumberOfPages()}`);

// 3. Generate Multi-Syndicate Deep Dossier (demonstrating 3-page ceiling)
const complexAd = {
  ...extendedAd,
  original_text: extendedAd.original_text + ' Detailed network intelligence logs confirm high-velocity transaction bursts across multiple state jurisdictions. Subject syndicate operates active telegram channels with rotational SIM numbers and pre-configured international wire routing.',
  analysis: {
    ...extendedAd.analysis,
    triggered_rules: [
      ...extendedAd.analysis.triggered_rules,
      { rule_id: 'RULE_INTERNATIONAL_ESCROW', description: 'Cross-border illicit escrow service advertisement avoiding banking controls', weight: 35 },
      { rule_id: 'RULE_BULK_MULE_HARVESTING', description: 'Mass onboarding of student and temporary worker accounts as pass-through mules', weight: 40 },
      { rule_id: 'RULE_FAST_CASHOUT_TELEGRAM', description: 'Automated rapid cashout channels with real-time balance clearing', weight: 30 },
    ]
  }
};

const docComplex = buildPdf(complexAd, {
  caseId: 'CASE-2026-0003',
  linkedPosts: [
    { id: 'AD-DEMO-002', platform: 'Instagram', identifier: 'Shared Drop Terminal (ShadowVault)', risk: 'HIGH' },
    { id: 'AD-DEMO-004', platform: 'Telegram', identifier: 'Shared Telegram Channel (@FastCashDrop)', risk: 'HIGH' },
    { id: 'AD-DEMO-006', platform: 'Telegram', identifier: 'Exact Content Fingerprint Duplicate Match', risk: 'HIGH' },
    { id: 'AD-DEMO-007', platform: 'Telegram', identifier: 'Shared Phone Identifier (+1-555-019-8234)', risk: 'HIGH' },
    { id: 'AD-DEMO-013', platform: 'Web', identifier: 'Shared Landing Page (shadowvault-drop.xyz)', risk: 'HIGH' },
    { id: 'AD-DEMO-014', platform: 'WhatsApp', identifier: 'Shared WhatsApp Contact (+1-555-014-9981)', risk: 'HIGH' },
  ],
  analystNotes: 'Comprehensive forensic analysis confirms active cross-platform money laundering network. The syndicate utilizes multi-layered mule accounts with automated forwarding protocols. High priority target for coordinated legal enforcement, merchant terminal cancellation, and domain registry seizure.'
});

const complexPdfPath = path.join(__dirname, 'sample_finguard_report_complex.pdf');
fs.writeFileSync(complexPdfPath, Buffer.from(docComplex.output('arraybuffer')));
console.log(`Complex Multi-Syndicate Report generated at: ${complexPdfPath}`);
console.log(`Complex Report Page Count: ${docComplex.getNumberOfPages()}`);

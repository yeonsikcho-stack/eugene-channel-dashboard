import { NextRequest, NextResponse } from 'next/server';
import PptxGenJS from 'pptxgenjs';
import {
  getMonthlyReportData,
  REPORT_PLACEHOLDER_NOTES,
  type ReportChannelSection,
  type MonthlyReportData,
} from '@/lib/report';
import { currentYearMonth } from '@/lib/channels';

const C = {
  ink: '14161F',
  inkSecondary: '53566A',
  inkMuted: '8A8DA0',
  surface: 'FFFFFF',
  paper: 'FAF9F5',
  border: 'E5E5E5',
  accent: '2451E0',
  accentSoft: 'EEF2FE',
  success: '16794F',
  successSoft: 'EAF6EF',
  danger: 'C23B3B',
  dangerSoft: 'FBECEB',
};

function monthLabel(yearMonth: string): string {
  return `${parseInt(yearMonth.split('-')[1], 10)}월`;
}

function directionArrow(direction: string): string {
  if (direction === 'up') return '▲';
  if (direction === 'down') return '▼';
  return '-';
}

async function fetchImageDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function footer(slide: PptxGenJS.Slide, pageNote: string) {
  slide.addText(pageNote, {
    x: 0.4,
    y: 7.1,
    w: 12.5,
    h: 0.3,
    fontSize: 9,
    color: C.inkMuted,
    isTextBox: true,
    margin: 0,
  });
}

function buildTitleSlide(pres: PptxGenJS, data: MonthlyReportData) {
  const slide = pres.addSlide();
  slide.background = { color: C.ink };

  const [year, month] = data.yearMonth.split('-');

  slide.addText('온라인 커뮤니케이션 채널 운영보고', {
    x: 0.8,
    y: 2.6,
    w: 11.7,
    h: 0.8,
    fontSize: 32,
    bold: true,
    color: 'FFFFFF',
    isTextBox: true,
    margin: 0,
  });
  slide.addText(`${year}년 ${parseInt(month, 10)}월`, {
    x: 0.8,
    y: 3.5,
    w: 11.7,
    h: 0.5,
    fontSize: 18,
    color: 'CADCFC',
    isTextBox: true,
    margin: 0,
  });
  slide.addText(`생성일: ${data.generatedAt.slice(0, 10)}`, {
    x: 0.8,
    y: 6.6,
    w: 11.7,
    h: 0.4,
    fontSize: 11,
    color: '8A96C9',
    isTextBox: true,
    margin: 0,
  });
}

function buildSummarySlide(pres: PptxGenJS, data: MonthlyReportData) {
  const slide = pres.addSlide();
  slide.background = { color: C.surface };

  slide.addText('01. 운영 결과 요약', {
    x: 0.5,
    y: 0.35,
    w: 12.3,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: C.ink,
    isTextBox: true,
    margin: 0,
  });

  const rowH = 1.35;
  data.channels.forEach((section, i) => {
    const y = 1.1 + i * rowH;
    const line = section.hasData
      ? section.insights[0] ?? `${section.label} 지표를 확인 중입니다.`
      : `${section.label}: ${REPORT_PLACEHOLDER_NOTES[section.channel] ?? '데이터 연동 준비 중입니다.'}`;

    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.5,
      y,
      w: 12.3,
      h: rowH - 0.2,
      rectRadius: 0.08,
      fill: { color: section.hasData ? C.accentSoft : C.paper },
      line: { color: C.border, width: 0.75 },
    });
    slide.addText(section.label, {
      x: 0.75,
      y: y + 0.12,
      w: 2.2,
      h: rowH - 0.4,
      fontSize: 14,
      bold: true,
      color: C.ink,
      isTextBox: true,
      margin: 0,
      valign: 'top',
    });
    slide.addText(line, {
      x: 3.0,
      y: y + 0.12,
      w: 9.6,
      h: rowH - 0.4,
      fontSize: 12,
      color: C.inkSecondary,
      isTextBox: true,
      margin: 0,
      valign: 'top',
      wrap: true,
    });
  });

  footer(slide, `${monthLabel(data.yearMonth)} 운영보고 · 자동 생성`);
}

function buildKpiSlide(pres: PptxGenJS, data: MonthlyReportData) {
  const slide = pres.addSlide();
  slide.background = { color: C.surface };

  slide.addText('02. KPI 달성 현황', {
    x: 0.5,
    y: 0.35,
    w: 12.3,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: C.ink,
    isTextBox: true,
    margin: 0,
  });

  const headerRow = ['채널', '지표', '현재', '목표', '달성률'].map((text) => ({
    text,
    options: { bold: true, color: 'FFFFFF', fill: { color: C.ink }, fontSize: 11 },
  }));

  const rows: PptxGenJS.TableRow[] = [headerRow];

  for (const section of data.channels) {
    if (!section.hasData) {
      rows.push([
        { text: section.label, options: { bold: true, fontSize: 11, color: C.ink } },
        {
          text: REPORT_PLACEHOLDER_NOTES[section.channel] ?? '데이터 연동 준비 중',
          options: { colspan: 4, fontSize: 11, color: C.inkMuted, align: 'left' },
        },
      ]);
      continue;
    }

    section.kpis.forEach((kpi, i) => {
      const row: PptxGenJS.TableRow = [];
      if (i === 0) {
        row.push({ text: section.label, options: { bold: true, fontSize: 11, color: C.ink, rowspan: section.kpis.length } });
      }
      row.push(
        { text: kpi.label, options: { fontSize: 11, color: C.ink } },
        { text: kpi.current !== null ? kpi.current.toLocaleString() : '-', options: { fontSize: 11, color: C.ink, align: 'right' } },
        { text: kpi.target.toLocaleString(), options: { fontSize: 11, color: C.inkMuted, align: 'right' } },
        {
          text: kpi.achievementPct !== null ? `${kpi.achievementPct}%` : '-',
          options: {
            fontSize: 11,
            bold: true,
            align: 'right',
            color: kpi.achievementPct !== null && kpi.achievementPct >= 100 ? C.success : C.danger,
          },
        },
      );
      rows.push(row);
    });
  }

  slide.addTable(rows, {
    x: 0.5,
    y: 1.1,
    w: 12.3,
    colW: [2.2, 2.6, 2.5, 2.5, 2.5],
    border: { type: 'solid', color: C.border, pt: 0.5 },
    autoPage: false,
  });

  footer(slide, `${monthLabel(data.yearMonth)} 운영보고 · 자동 생성`);
}

async function buildChannelSlide(pres: PptxGenJS, section: ReportChannelSection, yearMonth: string, index: number) {
  const slide = pres.addSlide();
  slide.background = { color: C.surface };

  slide.addText(`0${3 + index}. ${section.label}`, {
    x: 0.5,
    y: 0.35,
    w: 12.3,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: C.ink,
    isTextBox: true,
    margin: 0,
  });

  if (!section.hasData) {
    slide.addShape(pres.ShapeType.roundRect, {
      x: 2.9,
      y: 2.6,
      w: 7.5,
      h: 2.2,
      rectRadius: 0.1,
      fill: { color: C.paper },
      line: { color: C.border, width: 0.75 },
    });
    slide.addText('데이터 연동 준비 중입니다', {
      x: 2.9,
      y: 2.9,
      w: 7.5,
      h: 0.6,
      fontSize: 18,
      bold: true,
      color: C.ink,
      align: 'center',
      isTextBox: true,
      margin: 0,
    });
    slide.addText(REPORT_PLACEHOLDER_NOTES[section.channel] ?? '연동 준비 중입니다.', {
      x: 3.2,
      y: 3.6,
      w: 6.9,
      h: 0.8,
      fontSize: 13,
      color: C.inkSecondary,
      align: 'center',
      isTextBox: true,
      margin: 0,
    });
    footer(slide, `${monthLabel(yearMonth)} 운영보고 · 자동 생성`);
    return;
  }

  // KPI cards (left column)
  section.kpis.forEach((kpi, i) => {
    const y = 1.1 + i * 1.5;
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.5,
      y,
      w: 5.9,
      h: 1.3,
      rectRadius: 0.08,
      fill: { color: C.paper },
      line: { color: C.border, width: 0.75 },
    });
    slide.addText(kpi.label, {
      x: 0.7,
      y: y + 0.12,
      w: 3.5,
      h: 0.4,
      fontSize: 13,
      bold: true,
      color: C.ink,
      isTextBox: true,
      margin: 0,
    });
    slide.addText(
      `${kpi.current !== null ? kpi.current.toLocaleString() : '데이터 없음'} / ${kpi.target.toLocaleString()}`,
      { x: 0.7, y: y + 0.5, w: 3.8, h: 0.4, fontSize: 15, bold: true, color: C.ink, isTextBox: true, margin: 0 },
    );
    slide.addText(kpi.cadence === 'cumulative' ? '누적(당월 값)' : '합계(연초~당월)', {
      x: 0.7,
      y: y + 0.88,
      w: 3.8,
      h: 0.3,
      fontSize: 8,
      color: C.inkMuted,
      isTextBox: true,
      margin: 0,
    });
    if (kpi.achievementPct !== null) {
      slide.addText(`달성률 ${kpi.achievementPct}%`, {
        x: 4.4,
        y: y + 0.12,
        w: 1.9,
        h: 0.4,
        fontSize: 12,
        bold: true,
        align: 'right',
        color: kpi.achievementPct >= 100 ? C.success : C.danger,
        isTextBox: true,
        margin: 0,
      });
    }
  });

  // Growth trend chart (right column)
  const growthTrend = section.trends[0] ?? null;
  if (growthTrend) {
    const validCount = growthTrend.values.filter((v) => v !== null).length;
    if (validCount >= 2) {
      slide.addChart(
        pres.ChartType.line,
        [
          {
            name: growthTrend.label,
            labels: growthTrend.months.map(monthLabel),
            values: growthTrend.values.map((v) => v ?? 0),
          },
        ],
        {
          x: 6.7,
          y: 1.1,
          w: 6.1,
          h: 3.1,
          showTitle: true,
          title: `${growthTrend.label} 추이`,
          titleFontSize: 12,
          showValue: false,
          chartColors: [C.accent],
          catAxisLabelColor: C.inkMuted,
          catAxisLabelFontSize: 9,
          valAxisLabelColor: C.inkMuted,
          valAxisLabelFontSize: 9,
          valGridLine: { color: C.border, size: 1 },
          catGridLine: { style: 'none' },
          showLegend: false,
          lineSize: 2,
          lineDataSymbol: 'circle',
          lineDataSymbolSize: 4,
        },
      );
    }
  }

  // Current month metric summary
  const metricLine = section.metrics
    .map((m) => `${m.label} ${m.current !== null ? m.current.toLocaleString() : '-'}${m.diff !== null ? ` (${directionArrow(m.direction)}${Math.abs(m.diff).toLocaleString()})` : ''}`)
    .join('   ·   ');
  slide.addText(`당월 지표 (전월 대비)`, {
    x: 0.5,
    y: 4.5,
    w: 12.3,
    h: 0.25,
    fontSize: 9,
    color: C.inkMuted,
    isTextBox: true,
    margin: 0,
  });
  slide.addText(metricLine, {
    x: 0.5,
    y: 4.75,
    w: 12.3,
    h: 0.4,
    fontSize: 11,
    color: C.inkSecondary,
    isTextBox: true,
    margin: 0,
  });

  // Top content
  let y = 5.25;
  if (section.topContent) {
    slide.addText('이번 달 BEST 콘텐츠', {
      x: 0.5,
      y,
      w: 12.3,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: C.inkMuted,
      isTextBox: true,
      margin: 0,
    });

    const imageData = await fetchImageDataUri(section.topContent.thumbnailUrl);
    if (imageData) {
      slide.addImage({ data: imageData, x: 0.5, y: y + 0.3, w: 1.5, h: 0.95 });
      slide.addText(`${section.topContent.title}  (${section.topContent.statsLabel})`, {
        x: 2.2,
        y: y + 0.3,
        w: 10.6,
        h: 0.95,
        fontSize: 12,
        color: C.ink,
        isTextBox: true,
        margin: 0,
        valign: 'middle',
      });
      y += 1.15;
    } else {
      slide.addText(`${section.topContent.title}  (${section.topContent.statsLabel})`, {
        x: 0.5,
        y: y + 0.3,
        w: 12.3,
        h: 0.4,
        fontSize: 12,
        color: C.ink,
        isTextBox: true,
        margin: 0,
      });
      y += 0.75;
    }
  }

  // Insights
  if (section.insights.length > 0) {
    slide.addText(
      section.insights.slice(0, 2).map((line) => ({ text: line, options: { bullet: true, breakLine: true } })),
      {
        x: 0.5,
        y,
        w: 12.3,
        h: 1.1,
        fontSize: 11,
        color: C.inkSecondary,
        isTextBox: true,
        margin: 0,
        valign: 'top',
      },
    );
  }

  footer(slide, `${monthLabel(yearMonth)} 운영보고 · 자동 생성`);
}

function buildInsightSlide(pres: PptxGenJS, data: MonthlyReportData) {
  const slide = pres.addSlide();
  slide.background = { color: C.surface };

  slide.addText('07. 종합 인사이트 및 다음 달 제언', {
    x: 0.5,
    y: 0.35,
    w: 12.3,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: C.ink,
    isTextBox: true,
    margin: 0,
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.5,
    y: 1.1,
    w: 5.95,
    h: 5.6,
    rectRadius: 0.08,
    fill: { color: C.dangerSoft },
    line: { type: 'none' },
  });
  slide.addText('부족한 지표 · 주력 필요', {
    x: 0.75,
    y: 1.3,
    w: 5.4,
    h: 0.35,
    fontSize: 12,
    bold: true,
    color: C.danger,
    isTextBox: true,
    margin: 0,
  });
  slide.addText(
    data.overallInsights.gaps.map((line) => ({ text: line, options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } })),
    { x: 0.75, y: 1.75, w: 5.4, h: 4.8, fontSize: 12, color: C.ink, isTextBox: true, margin: 0, valign: 'top' },
  );

  slide.addShape(pres.ShapeType.roundRect, {
    x: 6.85,
    y: 1.1,
    w: 5.95,
    h: 5.6,
    rectRadius: 0.08,
    fill: { color: C.successSoft },
    line: { type: 'none' },
  });
  slide.addText('잘하고 있는 지표', {
    x: 7.1,
    y: 1.3,
    w: 5.4,
    h: 0.35,
    fontSize: 12,
    bold: true,
    color: C.success,
    isTextBox: true,
    margin: 0,
  });
  slide.addText(
    data.overallInsights.strengths.map((line) => ({ text: line, options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } })),
    { x: 7.1, y: 1.75, w: 5.4, h: 4.8, fontSize: 12, color: C.ink, isTextBox: true, margin: 0, valign: 'top' },
  );

  footer(slide, `${monthLabel(data.yearMonth)} 운영보고 · 자동 생성`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearMonth = searchParams.get('yearMonth') ?? currentYearMonth();

  const data = await getMonthlyReportData(yearMonth);

  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';

  buildTitleSlide(pres, data);
  buildSummarySlide(pres, data);
  buildKpiSlide(pres, data);
  for (const [i, section] of data.channels.entries()) {
    await buildChannelSlide(pres, section, yearMonth, i);
  }
  buildInsightSlide(pres, data);

  const buffer = (await pres.write({ outputType: 'nodebuffer' })) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${yearMonth}_channel_report.pptx"`,
    },
  });
}

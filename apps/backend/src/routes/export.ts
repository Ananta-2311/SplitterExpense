import { Router, Response } from 'express';
import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';

const router = Router();
const prisma = new PrismaClient();

// PDF Export endpoint
router.post('/pdf', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { month, year, chartImages, summaries } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        error: { message: 'Month and year are required' },
      });
    }

    // Calculate date range for the specified month
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    // Get transactions for the month
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: {
          select: {
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Calculate summaries for the selected month
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
      }
    });

    const net = totalIncome - totalExpense;

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="expense-report-${year}-${String(month).padStart(2, '0')}.pdf"`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Helper function to format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    };

    // Helper function to format date
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    // Header
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const monthName = monthNames[parseInt(month) - 1];

    doc.fontSize(24).text('Expense Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(18).text(`${monthName} ${year}`, { align: 'center' });
    doc.moveDown(2);

    // Summary Section
    doc.fontSize(16).text('Summary', { underline: true });
    doc.moveDown(0.5);

    const summaryY = doc.y;
    doc.fontSize(12);
    doc.text('Total Income:', 50, summaryY);
    doc.text(formatCurrency(totalIncome), 200, summaryY, { align: 'right', width: 100 });
    
    doc.text('Total Expense:', 50, summaryY + 20);
    doc.text(formatCurrency(totalExpense), 200, summaryY + 20, { align: 'right', width: 100 });
    
    doc.text('Net:', 50, summaryY + 40);
    doc.text(formatCurrency(net), 200, summaryY + 40, {
      align: 'right',
      width: 100,
      color: net >= 0 ? '#10B981' : '#EF4444',
    });

    doc.moveDown(2);

    // Charts Section
    if (chartImages && chartImages.length > 0) {
      doc.fontSize(16).text('Charts', { underline: true });
      doc.moveDown(0.5);

      chartImages.forEach((chart: { type: string; image: string }, index: number) => {
        if (index > 0) {
          doc.addPage();
        }

        // Chart title
        const chartTitles: Record<string, string> = {
          monthly: 'Monthly Overview',
          category: 'Expenses by Category',
          incomeExpense: 'Income vs Expense',
        };
        doc.fontSize(14).text(chartTitles[chart.type] || 'Chart', { align: 'center' });
        doc.moveDown(0.5);

        // Add chart image
        try {
          // Remove data URL prefix if present
          const base64Data = chart.image.replace(/^data:image\/\w+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          // Calculate image dimensions to fit page width (with margins)
          const pageWidth = doc.page.width - 100; // 50px margin on each side
          const maxHeight = 300;
          
          doc.image(imageBuffer, {
            fit: [pageWidth, maxHeight],
            align: 'center',
          });
        } catch (error) {
          console.error('Error adding chart image:', error);
          doc.fontSize(10).text('Chart image could not be included', { align: 'center' });
        }

        doc.moveDown(1);
      });

      // Add new page for transactions table
      doc.addPage();
    }

    // Transactions Table
    doc.fontSize(16).text('Transactions', { underline: true });
    doc.moveDown(0.5);

    if (transactions.length === 0) {
      doc.fontSize(12).text('No transactions found for this month.', { align: 'center' });
    } else {
      // Table header
      const tableTop = doc.y;
      const tableLeft = 50;
      const colWidths = [80, 200, 100, 100, 80];
      const rowHeight = 25;

      // Header row
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Date', tableLeft, tableTop);
      doc.text('Description', tableLeft + colWidths[0], tableTop);
      doc.text('Category', tableLeft + colWidths[0] + colWidths[1], tableTop);
      doc.text('Amount', tableLeft + colWidths[0] + colWidths[1] + colWidths[2], tableTop);
      doc.text('Type', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], tableTop);

      // Draw header underline
      doc
        .moveTo(tableLeft, tableTop + 15)
        .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), tableTop + 15)
        .stroke();

      // Transaction rows
      doc.fontSize(9).font('Helvetica');
      let currentY = tableTop + rowHeight;

      transactions.forEach((transaction, index) => {
        // Check if we need a new page
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 50;
        }

        doc.text(formatDate(transaction.date), tableLeft, currentY);
        doc.text(transaction.description, tableLeft + colWidths[0], currentY, {
          width: colWidths[1],
          ellipsis: true,
        });
        doc.text(transaction.category.name, tableLeft + colWidths[0] + colWidths[1], currentY, {
          width: colWidths[2],
          ellipsis: true,
        });
        doc.text(formatCurrency(transaction.amount), tableLeft + colWidths[0] + colWidths[1] + colWidths[2], currentY, {
          width: colWidths[3],
          align: 'right',
        });
        doc.text(transaction.type === 'income' ? 'Income' : 'Expense', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], currentY, {
          width: colWidths[4],
          align: 'center',
        });

        currentY += rowHeight;
      });
    }

    // Footer
    doc.fontSize(8).text(
      `Generated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`,
      50,
      doc.page.height - 50,
      { align: 'center', width: doc.page.width - 100 }
    );

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to generate PDF',
      },
    });
  }
});

export default router;

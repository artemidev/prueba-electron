/**
 * CBX POS 89E Thermal Printer Implementation
 * 
 * This module implements the IPrinter interface for the CBX POS 89E thermal printer.
 * It uses electron-pos-printer as the primary library with fallback to node-thermal-printer
 * for low-level ESC/POS commands when needed.
 */

import { PosPrinter } from 'electron-pos-printer';
import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';
import {
  BasePrinter,
  PrinterConfig,
  PrintContent,
  PrintJobConfig,
  PrinterStatus,
  PrinterError,
  PrinterErrorCode,
  TextAlignment,
  FontStyle,
  FontSize,
  PaperSize
} from '../interfaces';

export class CbxPos89ePrinter extends BasePrinter {
  private posPrinter: PosPrinter | null = null;
  private thermalPrinter: ThermalPrinter | null = null;
  private lastJobId = 0;

  constructor(id: string, config: PrinterConfig) {
    super(id, config);
    this.initializePrinters();
  }

  private initializePrinters(): void {
    try {
      // Initialize electron-pos-printer (primary)
      // Note: PosPrinter is typically used statically, not as an instance
      this.posPrinter = PosPrinter as any;

      // Initialize node-thermal-printer (fallback/advanced commands)
      this.thermalPrinter = new ThermalPrinter({
        type: PrinterTypes.EPSON, // CBX POS 89E is ESC/POS compatible
        interface: this.getInterfaceString(),
        characterSet: CharacterSet.PC437_USA,
        width: this.getWidthFromPaperSize(this.config.paperSize),
        removeSpecialCharacters: false,
        lineCharacter: '='
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new PrinterError(
        `Failed to initialize CBX POS 89E printer: ${errorMessage}`,
        PrinterErrorCode.INVALID_CONFIG,
        this.id,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private getPaperSizeMapping(paperSize: PaperSize): string {
    const sizeMap: Record<PaperSize, string> = {
      [PaperSize.MM_80]: '80mm',
      [PaperSize.MM_78]: '78mm',
      [PaperSize.MM_76]: '76mm',
      [PaperSize.MM_58]: '58mm',
      [PaperSize.MM_57]: '57mm',
      [PaperSize.MM_44]: '44mm'
    };
    return sizeMap[paperSize] || '80mm';
  }

  private getWidthFromPaperSize(paperSize: PaperSize): number {
    const widthMap: Record<PaperSize, number> = {
      [PaperSize.MM_80]: 48,
      [PaperSize.MM_78]: 46,
      [PaperSize.MM_76]: 45,
      [PaperSize.MM_58]: 32,
      [PaperSize.MM_57]: 32,
      [PaperSize.MM_44]: 24
    };
    return widthMap[paperSize] || 48;
  }

  private getInterfaceString(): string {
    switch (this.config.connectionType) {
      case 'usb':
        return `printer:${this.config.connectionString}`;
      case 'serial':
        return this.config.connectionString;
      case 'network':
        return `tcp://${this.config.connectionString}`;
      default:
        return `printer:${this.config.connectionString}`;
    }
  }

  async connect(): Promise<void> {
    try {
      this.setStatus(PrinterStatus.IDLE);
      
      // Test connection by getting printer status
      if (this.thermalPrinter) {
        const isConnected = await this.thermalPrinter.isPrinterConnected();
        if (!isConnected) {
          throw new Error('Printer not responding');
        }
      }

      this._isConnected = true;
      this.emitEvent('connection_restored');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this._isConnected = false;
      this.setStatus(PrinterStatus.OFFLINE);
      this.handleError(new PrinterError(
        `Failed to connect to CBX POS 89E printer: ${errorMessage}`,
        PrinterErrorCode.CONNECTION_FAILED,
        this.id,
        error instanceof Error ? error : new Error(String(error))
      ));
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.thermalPrinter) {
        // Clear any pending data
        this.thermalPrinter.clear();
      }
      
      this._isConnected = false;
      this.setStatus(PrinterStatus.OFFLINE);
      this.emitEvent('connection_lost');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.handleError(new PrinterError(
        `Failed to disconnect from printer: ${errorMessage}`,
        PrinterErrorCode.CONNECTION_FAILED,
        this.id,
        error instanceof Error ? error : new Error(String(error))
      ));
    }
  }

  async getStatus(): Promise<PrinterStatus> {
    if (!this._isConnected) {
      return PrinterStatus.OFFLINE;
    }

    try {
      // For CBX POS 89E, we'll simulate status checking
      // In a real implementation, you would query the printer's actual status
      if (this.thermalPrinter) {
        const isConnected = await this.thermalPrinter.isPrinterConnected();
        if (!isConnected) {
          this.setStatus(PrinterStatus.OFFLINE);
          return PrinterStatus.OFFLINE;
        }
      }

      // Return current status or default to IDLE if connected
      return this._status === PrinterStatus.OFFLINE ? PrinterStatus.IDLE : this._status;
    } catch (error) {
      this.setStatus(PrinterStatus.ERROR);
      return PrinterStatus.ERROR;
    }
  }

  async print(content: PrintContent[], config: PrintJobConfig = {}): Promise<string> {
    const jobId = `cbx_${this.id}_${++this.lastJobId}_${Date.now()}`;
    
    if (!this._isConnected) {
      throw new PrinterError(
        'Printer not connected',
        PrinterErrorCode.PRINTER_OFFLINE,
        this.id
      );
    }

    try {
      this.setStatus(PrinterStatus.PRINTING);
      this.emitEvent('job_started', { jobId });

      // Use electron-pos-printer for high-level operations
      if (this.posPrinter) {
        await this.printWithPosPrinter(content, config);
      } else if (this.thermalPrinter) {
        await this.printWithThermalPrinter(content, config);
      } else {
        throw new Error('No printer interface available');
      }

      // Handle post-print operations
      if (config.paperCut !== false) {
        await this.cutPaper();
      }

      if (config.openCashDrawer) {
        await this.openCashDrawer();
      }

      this.setStatus(PrinterStatus.IDLE);
      this.emitEvent('job_completed', { jobId });
      
      return jobId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.setStatus(PrinterStatus.ERROR);
      this.emitEvent('job_failed', { jobId, error: errorMessage });
      
      throw new PrinterError(
        `Print job failed: ${errorMessage}`,
        PrinterErrorCode.COMMAND_ERROR,
        this.id,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private async printWithPosPrinter(content: PrintContent[], config: PrintJobConfig): Promise<void> {
    if (!this.posPrinter) {
      throw new Error('PosPrinter not initialized');
    }

    const printData: any[] = [];

    for (const item of content) {
      switch (item.type) {
        case 'text':
          printData.push({
            type: 'text',
            value: item.content,
            style: this.convertTextStyle(item.format),
            css: this.convertTextCSS(item.format)
          });
          break;

        case 'line': {
          const lineChar = item.character || '-';
          const lineLength = item.length || this.getWidthFromPaperSize(this.config.paperSize);
          printData.push({
            type: 'text',
            value: lineChar.repeat(lineLength),
            style: { textAlign: 'center' }
          });
          break;
        }

        case 'feed': {
          for (let i = 0; i < item.lines; i++) {
            printData.push({
              type: 'text',
              value: ' ',
              style: { fontSize: '1px' }
            });
          }
          break;
        }

        case 'barcode':
          printData.push({
            type: 'barCode',
            value: item.data,
            height: item.height || 60,
            width: item.width || 2,
            displayValue: item.includeText !== false,
            format: item.format
          });
          break;

        case 'qrcode':
          printData.push({
            type: 'qrCode',
            value: item.data,
            size: item.size || 6,
            errorCorrectionLevel: item.errorLevel || 'M'
          });
          break;

        case 'image':
          printData.push({
            type: 'image',
            path: item.path,
            position: this.convertAlignment(item.alignment || 'center'),
            width: item.width,
            height: item.height
          });
          break;
      }
    }

    const options = {
      preview: false,
      margin: '0 0 0 0',
      copies: config.copies || 1,
      printerName: this.config.connectionString,
      timeOutPerLine: this.config.timeout || 400,
      silent: true
    };

    await PosPrinter.print(printData, options);
  }

  private async printWithThermalPrinter(content: PrintContent[], config: PrintJobConfig): Promise<void> {
    if (!this.thermalPrinter) {
      throw new Error('ThermalPrinter not initialized');
    }

    // Clear any previous content
    this.thermalPrinter.clear();

    for (const item of content) {
      switch (item.type) {
        case 'text':
          this.applyTextFormatting(item.format);
          this.thermalPrinter.println(item.content);
          break;

        case 'line': {
          const lineChar = item.character || '-';
          const lineLength = item.length || this.thermalPrinter.getWidth();
          this.thermalPrinter.println(lineChar.repeat(lineLength));
          break;
        }

        case 'feed': {
          for (let i = 0; i < item.lines; i++) {
            this.thermalPrinter.newLine();
          }
          break;
        }

        case 'barcode':
          this.thermalPrinter.printBarcode(item.data, item.format as any);
          break;

        case 'qrcode':
          this.thermalPrinter.printQR(item.data, {
            cellSize: item.size || 3,
            correction: item.errorLevel || 'M',
            model: 2
          });
          break;

        case 'cut':
          if (item.partial) {
            this.thermalPrinter.partialCut();
          } else {
            this.thermalPrinter.cut();
          }
          break;
      }
    }

    const success = await this.thermalPrinter.execute();
    if (!success) {
      throw new Error('Failed to execute thermal printer commands');
    }
  }

  private convertTextStyle(format: any = {}): any {
    return {
      fontWeight: format.style === FontStyle.BOLD ? 'bold' : 'normal',
      textDecoration: format.style === FontStyle.UNDERLINE ? 'underline' : 'none',
      fontStyle: format.style === FontStyle.ITALIC ? 'italic' : 'normal',
      textAlign: this.convertAlignment(format.alignment || TextAlignment.LEFT),
      fontSize: this.convertFontSize(format.size || FontSize.NORMAL)
    };
  }

  private convertTextCSS(format: any = {}): string {
    const styles: string[] = [];
    
    if (format.style === FontStyle.BOLD) styles.push('font-weight: bold');
    if (format.style === FontStyle.UNDERLINE) styles.push('text-decoration: underline');
    if (format.style === FontStyle.ITALIC) styles.push('font-style: italic');
    
    const alignment = this.convertAlignment(format.alignment || TextAlignment.LEFT);
    styles.push(`text-align: ${alignment}`);
    
    const fontSize = this.convertFontSize(format.size || FontSize.NORMAL);
    styles.push(`font-size: ${fontSize}`);
    
    return styles.join('; ');
  }

  private convertAlignment(alignment: TextAlignment): string {
    switch (alignment) {
      case TextAlignment.CENTER: return 'center';
      case TextAlignment.RIGHT: return 'right';
      case TextAlignment.LEFT:
      default:
        return 'left';
    }
  }

  private convertFontSize(size: FontSize): string {
    switch (size) {
      case FontSize.SMALL: return '10px';
      case FontSize.LARGE: return '16px';
      case FontSize.EXTRA_LARGE: return '20px';
      case FontSize.NORMAL:
      default:
        return '12px';
    }
  }

  private applyTextFormatting(format: any = {}): void {
    if (!this.thermalPrinter) return;

    // Reset formatting first
    this.thermalPrinter.setTypeFontA();
    this.thermalPrinter.alignLeft();

    // Apply alignment
    switch (format.alignment) {
      case TextAlignment.CENTER:
        this.thermalPrinter.alignCenter();
        break;
      case TextAlignment.RIGHT:
        this.thermalPrinter.alignRight();
        break;
      default:
        this.thermalPrinter.alignLeft();
    }

    // Apply text style
    if (format.style === FontStyle.BOLD) {
      this.thermalPrinter.bold(true);
    }
    if (format.style === FontStyle.UNDERLINE) {
      this.thermalPrinter.underline(true);
    }

    // Apply font size
    switch (format.size) {
      case FontSize.LARGE:
        this.thermalPrinter.setTextDoubleHeight();
        break;
      case FontSize.EXTRA_LARGE:
        this.thermalPrinter.setTextQuadArea();
        break;
      case FontSize.SMALL:
        this.thermalPrinter.setTypeFontB();
        break;
    }
  }

  async cutPaper(partial = false): Promise<void> {
    try {
      if (this.thermalPrinter) {
        if (partial) {
          this.thermalPrinter.partialCut();
        } else {
          this.thermalPrinter.cut();
        }
        await this.thermalPrinter.execute();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new PrinterError(
        `Failed to cut paper: ${errorMessage}`,
        PrinterErrorCode.COMMAND_ERROR,
        this.id,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async openCashDrawer(): Promise<void> {
    try {
      if (this.thermalPrinter) {
        this.thermalPrinter.openCashDrawer();
        await this.thermalPrinter.execute();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new PrinterError(
        `Failed to open cash drawer: ${errorMessage}`,
        PrinterErrorCode.COMMAND_ERROR,
        this.id,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async feedPaper(lines: number): Promise<void> {
    try {
      if (this.thermalPrinter) {
        for (let i = 0; i < lines; i++) {
          this.thermalPrinter.newLine();
        }
        await this.thermalPrinter.execute();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new PrinterError(
        `Failed to feed paper: ${errorMessage}`,
        PrinterErrorCode.COMMAND_ERROR,
        this.id,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async selfTest(): Promise<boolean> {
    try {
      if (!this._isConnected) {
        return false;
      }

      // Perform basic connectivity test
      if (this.thermalPrinter) {
        return await this.thermalPrinter.isPrinterConnected();
      }

      // Fallback test - try to print a simple test
      await this.printText('TEST', { paperCut: false });
      return true;
    } catch (error) {
      return false;
    }
  }
}
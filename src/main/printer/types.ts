/**
 * Thermal Printer Control System - Type Definitions
 * 
 * This module defines all types, interfaces, and enums for the thermal printer system.
 * It provides a comprehensive type system for printer operations, configurations,
 * and error handling.
 */

// Printer connection types
export enum PrinterConnectionType {
  USB = 'usb',
  SERIAL = 'serial',
  NETWORK = 'network',
  BLUETOOTH = 'bluetooth'
}

// Printer status enumeration
export enum PrinterStatus {
  IDLE = 'idle',
  PRINTING = 'printing',
  ERROR = 'error',
  OFFLINE = 'offline',
  OUT_OF_PAPER = 'out_of_paper',
  COVER_OPEN = 'cover_open'
}

// Paper sizes supported
export enum PaperSize {
  MM_80 = '80mm',
  MM_78 = '78mm',
  MM_76 = '76mm',
  MM_58 = '58mm',
  MM_57 = '57mm',
  MM_44 = '44mm'
}

// Printer types/brands
export enum PrinterType {
  CBX_POS_89E = 'cbx_pos_89e',
  EPSON = 'epson',
  STAR = 'star',
  GENERIC_ESC_POS = 'generic_esc_pos'
}

// Text alignment options
export enum TextAlignment {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right'
}

// Font styles
export enum FontStyle {
  NORMAL = 'normal',
  BOLD = 'bold',
  ITALIC = 'italic',
  UNDERLINE = 'underline'
}

// Font sizes
export enum FontSize {
  SMALL = 'small',
  NORMAL = 'normal',
  LARGE = 'large',
  EXTRA_LARGE = 'extra_large'
}

// Printer configuration interface
export interface PrinterConfig {
  id: string;
  name: string;
  type: PrinterType;
  connectionType: PrinterConnectionType;
  connectionString: string; // USB device path, IP:port, COM port, etc.
  paperSize: PaperSize;
  characterSet?: string;
  timeout?: number;
  retryAttempts?: number;
  isDefault?: boolean;
}

// Print job configuration
export interface PrintJobConfig {
  copies?: number;
  timeout?: number;
  priority?: 'low' | 'normal' | 'high';
  retryOnError?: boolean;
  paperCut?: boolean;
  openCashDrawer?: boolean;
}

// Text formatting options
export interface TextFormat {
  alignment?: TextAlignment;
  style?: FontStyle;
  size?: FontSize;
  width?: number;
  height?: number;
}

// Print content types
export interface PrintText {
  type: 'text';
  content: string;
  format?: TextFormat;
}

export interface PrintBarcode {
  type: 'barcode';
  data: string;
  format: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC_A' | 'UPC_E';
  width?: number;
  height?: number;
  includeText?: boolean;
}

export interface PrintQRCode {
  type: 'qrcode';
  data: string;
  size?: number;
  errorLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface PrintImage {
  type: 'image';
  path: string;
  width?: number;
  height?: number;
  alignment?: TextAlignment;
}

export interface PrintLine {
  type: 'line';
  character?: string;
  length?: number;
}

export interface PrintFeed {
  type: 'feed';
  lines: number;
}

export interface PrintCut {
  type: 'cut';
  partial?: boolean;
}

// Union type for all print content
export type PrintContent = 
  | PrintText 
  | PrintBarcode 
  | PrintQRCode 
  | PrintImage 
  | PrintLine 
  | PrintFeed 
  | PrintCut;

// Print job definition
export interface PrintJob {
  id: string;
  printerId: string;
  content: PrintContent[];
  config?: PrintJobConfig;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// Printer information
export interface PrinterInfo {
  id: string;
  name: string;
  type: PrinterType;
  status: PrinterStatus;
  isConnected: boolean;
  lastError?: string;
  paperLevel?: number; // 0-100 percentage
  temperature?: number;
  voltage?: number;
}

// Error types
export class PrinterError extends Error {
  constructor(
    message: string,
    public code: PrinterErrorCode,
    public printerId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'PrinterError';
  }
}

export enum PrinterErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  PRINTER_OFFLINE = 'PRINTER_OFFLINE',
  OUT_OF_PAPER = 'OUT_OF_PAPER',
  COVER_OPEN = 'COVER_OPEN',
  PAPER_JAM = 'PAPER_JAM',
  OVERHEAT = 'OVERHEAT',
  LOW_VOLTAGE = 'LOW_VOLTAGE',
  COMMAND_ERROR = 'COMMAND_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_CONFIG = 'INVALID_CONFIG',
  PRINTER_NOT_FOUND = 'PRINTER_NOT_FOUND',
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION'
}

// Event types for printer notifications
export interface PrinterEvent {
  type: PrinterEventType;
  printerId: string;
  timestamp: Date;
  data?: any;
}

export enum PrinterEventType {
  STATUS_CHANGED = 'status_changed',
  JOB_STARTED = 'job_started',
  JOB_COMPLETED = 'job_completed',
  JOB_FAILED = 'job_failed',
  CONNECTION_LOST = 'connection_lost',
  CONNECTION_RESTORED = 'connection_restored',
  ERROR = 'error'
}

// Callback types
export type PrinterEventCallback = (event: PrinterEvent) => void;
export type PrintJobCallback = (job: PrintJob) => void;

// Discovery result for finding available printers
export interface PrinterDiscoveryResult {
  id: string;
  name: string;
  type: PrinterType;
  connectionType: PrinterConnectionType;
  connectionString: string;
  isAvailable: boolean;
}
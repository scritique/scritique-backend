const fs = require('fs');
const path = require('path');

class CSVService {
  constructor() {
    const defaultDir = path.join(__dirname, '../formData');
    const configuredDir = process.env.FORM_DATA_DIR && process.env.FORM_DATA_DIR.trim() !== ''
      ? process.env.FORM_DATA_DIR
      : defaultDir;
    // Resolve to absolute path for safety
    this.formDataDir = path.isAbsolute(configuredDir)
      ? configuredDir
      : path.resolve(configuredDir);
    this.ensureFormDataDirectory();
  }

  ensureFormDataDirectory() {
    if (!fs.existsSync(this.formDataDir)) {
      fs.mkdirSync(this.formDataDir, { recursive: true });
    }
  }

  /**
   * Convert form data to CSV format
   * @param {Object} formData - The form submission data
   * @param {string} formType - Type of form (e.g., 'contact', 'career', 'custom')
   * @returns {string} CSV formatted string
   */
  formatToCSV(formData, formType) {
    const timestamp = new Date().toISOString();
    
    // Define CSV headers based on form type
    const headers = this.getHeadersForFormType(formType);
    
    // Create CSV row with data
    const row = headers.map(header => {
      const value = header === 'timestamp' ? timestamp : (header === 'form_type' ? formType : (formData[header] || ''));
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      const escapedValue = String(value).replace(/"/g, '""');
      if (escapedValue.includes(',') || escapedValue.includes('\n') || escapedValue.includes('"')) {
        return `"${escapedValue}"`;
      }
      return escapedValue;
    });

    return row.join(',');
  }

  /**
   * Get appropriate headers for different form types
   * @param {string} formType - Type of form
   * @returns {Array} Array of header names
   */
  getHeadersForFormType(formType) {
    const baseHeaders = ['timestamp', 'form_type'];
    
    switch (String(formType).toLowerCase()) {
      case 'contact':
        return [...baseHeaders, 'from_name', 'from_email', 'phone', 'service', 'message'];
      
      case 'career':
        return [...baseHeaders, 'from_name', 'from_email', 'phone', 'industry', 'role_title', 'experience', 'cover_letter', 'resume_filename', 'message'];
      
      case 'custom':
      default:
        return [...baseHeaders, 'from_name', 'from_email', 'phone', 'service', 'industry', 'role_title', 'experience', 'cover_letter', 'resume_filename', 'message'];
    }
  }

  /**
   * Write form data to CSV file
   * @param {Object} formData - The form submission data
   * @param {string} formType - Type of form
   * @returns {Promise<Object>} Result of the operation
   */
  async writeToCSV(formData, formType) {
    try {
      const csvRow = this.formatToCSV(formData, formType);
      const fileName = `${String(formType).toLowerCase()}_submissions.csv`;
      const filePath = path.join(this.formDataDir, fileName);
      
      // Check if file exists to determine if we need to write headers
      const fileExists = fs.existsSync(filePath);
      
      if (!fileExists) {
        // Create new file with headers
        const headers = this.getHeadersForFormType(formType);
        const headerRow = headers.join(',');
        fs.writeFileSync(filePath, headerRow + '\n');
      }
      
      // Append the new row
      fs.appendFileSync(filePath, csvRow + '\n');
      
      console.log(`✅ Form data written to CSV: ${fileName}`);
      
      return {
        success: true,
        filePath: filePath,
        fileName: fileName,
        message: 'Form data successfully logged to CSV'
      };
      
    } catch (error) {
      console.error('❌ Failed to write to CSV:', error);
      throw new Error(`CSV logging failed: ${error.message}`);
    }
  }

  /**
   * Read CSV file content
   * @param {string} formType - Type of form
   * @returns {Promise<Array>} Array of CSV rows
   */
  async readCSV(formType) {
    try {
      const fileName = `${String(formType).toLowerCase()}_submissions.csv`;
      const filePath = path.join(this.formDataDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        return [];
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      
      if (lines.length <= 1) {
        return [];
      }
      
      const headers = lines[0].split(',');
      const rows = lines.slice(1).map(line => {
        const values = this.parseCSVLine(line);
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });
      
      return rows;
      
    } catch (error) {
      console.error('❌ Failed to read CSV:', error);
      throw new Error(`CSV reading failed: ${error.message}`);
    }
  }

  /**
   * Parse CSV line handling quoted values
   * @param {string} line - CSV line to parse
   * @returns {Array} Array of parsed values
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current);
    return result;
  }

  /**
   * Get statistics about CSV files
   * @returns {Promise<Object>} Statistics about all CSV files
   */
  async getCSVStats() {
    try {
      const files = fs.readdirSync(this.formDataDir);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      const stats = {};
      
      for (const file of csvFiles) {
        const filePath = path.join(this.formDataDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.trim().split('\n');
        const rowCount = Math.max(0, lines.length - 1); // Subtract header row
        
        stats[file] = {
          rowCount: rowCount,
          size: fs.statSync(filePath).size,
          lastModified: fs.statSync(filePath).mtime
        };
      }
      
      return stats;
      
    } catch (error) {
      console.error('❌ Failed to get CSV stats:', error);
      throw new Error(`Failed to get CSV statistics: ${error.message}`);
    }
  }
}

module.exports = new CSVService();

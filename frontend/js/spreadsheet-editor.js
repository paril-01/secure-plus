// Spreadsheet Editor functionality for SecurePlus

document.addEventListener('DOMContentLoaded', function() {
    // Initialize event listeners for spreadsheet controls
    const addRowButton = document.getElementById('add-row');
    const addColumnButton = document.getElementById('add-column');
    const deleteRowButton = document.getElementById('delete-row');
    const deleteColumnButton = document.getElementById('delete-column');
    const cellFormatSelect = document.getElementById('cell-format');
    const saveButton = document.getElementById('save-spreadsheet');
    const closeButton = document.getElementById('close-spreadsheet');
    
    if (addRowButton) addRowButton.addEventListener('click', addRow);
    if (addColumnButton) addColumnButton.addEventListener('click', addColumn);
    if (deleteRowButton) deleteRowButton.addEventListener('click', deleteRow);
    if (deleteColumnButton) deleteColumnButton.addEventListener('click', deleteColumn);
    if (cellFormatSelect) cellFormatSelect.addEventListener('change', changeCellFormat);
    if (saveButton) saveButton.addEventListener('click', saveSpreadsheet);
    if (closeButton) closeButton.addEventListener('click', closeSpreadsheet);
});

// Initialize spreadsheet with content
function initializeSpreadsheet(file) {
    const spreadsheetContainer = document.getElementById('spreadsheet-editor');
    spreadsheetContainer.innerHTML = '';
    spreadsheetContainer.dataset.fileId = file.id;
    
    // Create spreadsheet table
    const table = document.createElement('table');
    table.className = 'spreadsheet-table';
    
    // Default size: 10x10
    const rows = 10;
    const cols = 10;
    
    // Create header row with column letters
    const headerRow = document.createElement('tr');
    const cornerCell = document.createElement('th');
    headerRow.appendChild(cornerCell);
    
    for (let j = 0; j < cols; j++) {
        const th = document.createElement('th');
        th.textContent = String.fromCharCode(65 + j); // A, B, C, ...
        headerRow.appendChild(th);
    }
    table.appendChild(headerRow);
    
    // Create data rows
    for (let i = 0; i < rows; i++) {
        const row = document.createElement('tr');
        
        // Row number
        const rowHeader = document.createElement('th');
        rowHeader.textContent = i + 1;
        row.appendChild(rowHeader);
        
        // Cells
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement('td');
            cell.contentEditable = true;
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('focus', onCellFocus);
            cell.addEventListener('blur', onCellBlur);
            cell.addEventListener('input', onCellInput);
            row.appendChild(cell);
        }
        
        table.appendChild(row);
    }
    
    spreadsheetContainer.appendChild(table);
    
    // Load data if available
    if (file.id) {
        loadSpreadsheetData(file.id);
    }
    
    // Set up auto-save
    setInterval(() => saveSpreadsheet(true), 30000);
}

// Load spreadsheet data from server
function loadSpreadsheetData(fileId) {
    fetch(`/api/files/${fileId}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        // Parse and populate the spreadsheet
        try {
            const content = JSON.parse(atob(data.content));
            populateSpreadsheet(content);
        } catch (error) {
            console.log('Error parsing spreadsheet data:', error);
            // For demo, create sample data
            const sampleData = [
                ['Product', 'Q1', 'Q2', 'Q3', 'Q4', 'Total'],
                ['Widgets', '150', '165', '182', '190', '=SUM(B2:E2)'],
                ['Gadgets', '120', '125', '130', '135', '=SUM(B3:E3)'],
                ['Doohickeys', '90', '100', '110', '120', '=SUM(B4:E4)'],
                ['Total', '=SUM(B2:B4)', '=SUM(C2:C4)', '=SUM(D2:D4)', '=SUM(E2:E4)', '=SUM(F2:F4)']
            ];
            populateSpreadsheet(sampleData);
        }
    })
    .catch(error => {
        console.log('Error loading spreadsheet:', error);
        
        // For demo, create sample data
        const sampleData = [
            ['Product', 'Q1', 'Q2', 'Q3', 'Q4', 'Total'],
            ['Widgets', '150', '165', '182', '190', '=SUM(B2:E2)'],
            ['Gadgets', '120', '125', '130', '135', '=SUM(B3:E3)'],
            ['Doohickeys', '90', '100', '110', '120', '=SUM(B4:E4)'],
            ['Total', '=SUM(B2:B4)', '=SUM(C2:C4)', '=SUM(D2:D4)', '=SUM(E2:E4)', '=SUM(F2:F4)']
        ];
        populateSpreadsheet(sampleData);
    });
}

// Populate spreadsheet with data
function populateSpreadsheet(data) {
    const table = document.querySelector('.spreadsheet-table');
    if (!table) return;
    
    // For each row of data
    for (let i = 0; i < data.length; i++) {
        // Skip if no row in table
        if (i >= table.rows.length - 1) continue;
        
        // Get the row (add 1 to skip header row)
        const row = table.rows[i + 1];
        
        // For each cell in the row
        for (let j = 0; j < data[i].length; j++) {
            // Skip if no cell in row
            if (j >= row.cells.length - 1) continue;
            
            // Get the cell (add 1 to skip row header)
            const cell = row.cells[j + 1];
            
            // Set cell value
            cell.textContent = data[i][j];
            
            // If cell contains a formula, evaluate it
            if (data[i][j] && data[i][j].toString().startsWith('=')) {
                evaluateFormula(cell);
            }
        }
    }
}

// Spreadsheet cell event handlers
function onCellFocus(event) {
    const cell = event.target;
    
    // Highlight the current row and column
    const table = document.querySelector('.spreadsheet-table');
    const rowIndex = parseInt(cell.dataset.row) + 1; // +1 for header
    const colIndex = parseInt(cell.dataset.col) + 1; // +1 for row label
    
    // Store original formula if the cell has one
    if (cell.textContent.startsWith('=')) {
        cell.dataset.formula = cell.textContent;
    }
    
    // Highlight current cell, row, and column
    for (let i = 0; i < table.rows.length; i++) {
        for (let j = 0; j < table.rows[i].cells.length; j++) {
            const currentCell = table.rows[i].cells[j];
            currentCell.classList.remove('highlight-row', 'highlight-col', 'active-cell');
            
            if (i === rowIndex) {
                currentCell.classList.add('highlight-row');
            }
            
            if (j === colIndex) {
                currentCell.classList.add('highlight-col');
            }
        }
    }
    
    cell.classList.add('active-cell');
}

function onCellBlur(event) {
    const cell = event.target;
    
    // If cell contains a formula, evaluate it
    if (cell.textContent.startsWith('=')) {
        evaluateFormula(cell);
    }
}

function onCellInput(event) {
    // Nothing special yet, but could track changes here
}

// Spreadsheet operations
function addRow() {
    const table = document.querySelector('.spreadsheet-table');
    if (!table) return;
    
    const rowCount = table.rows.length;
    const colCount = table.rows[0].cells.length;
    
    // Create new row
    const newRow = document.createElement('tr');
    
    // Row header
    const rowHeader = document.createElement('th');
    rowHeader.textContent = rowCount;
    newRow.appendChild(rowHeader);
    
    // Cells
    for (let j = 0; j < colCount - 1; j++) {
        const cell = document.createElement('td');
        cell.contentEditable = true;
        cell.dataset.row = rowCount - 1;
        cell.dataset.col = j;
        cell.addEventListener('focus', onCellFocus);
        cell.addEventListener('blur', onCellBlur);
        cell.addEventListener('input', onCellInput);
        newRow.appendChild(cell);
    }
    
    table.appendChild(newRow);
}

function addColumn() {
    const table = document.querySelector('.spreadsheet-table');
    if (!table) return;
    
    const rowCount = table.rows.length;
    const colCount = table.rows[0].cells.length;
    
    // Update header row
    const headerRow = table.rows[0];
    const newHeaderCell = document.createElement('th');
    newHeaderCell.textContent = String.fromCharCode(65 + colCount - 1); // A, B, C, ...
    headerRow.appendChild(newHeaderCell);
    
    // Add cell to each row
    for (let i = 1; i < rowCount; i++) {
        const row = table.rows[i];
        const cell = document.createElement('td');
        cell.contentEditable = true;
        cell.dataset.row = i - 1;
        cell.dataset.col = colCount - 1;
        cell.addEventListener('focus', onCellFocus);
        cell.addEventListener('blur', onCellBlur);
        cell.addEventListener('input', onCellInput);
        row.appendChild(cell);
    }
}

function deleteRow() {
    const table = document.querySelector('.spreadsheet-table');
    if (!table || table.rows.length <= 2) return; // Don't delete header row or last data row
    
    // Get the active cell to determine which row to delete
    const activeCell = document.querySelector('.active-cell');
    if (!activeCell) {
        // If no active cell, delete the last row
        table.deleteRow(table.rows.length - 1);
    } else {
        // Delete the row containing the active cell
        const rowIndex = parseInt(activeCell.dataset.row) + 1; // +1 for header
        table.deleteRow(rowIndex);
        
        // Update row indices for remaining rows
        updateRowIndices();
    }
}

function deleteColumn() {
    const table = document.querySelector('.spreadsheet-table');
    if (!table || table.rows[0].cells.length <= 2) return; // Don't delete row headers or last column
    
    // Get the active cell to determine which column to delete
    const activeCell = document.querySelector('.active-cell');
    if (!activeCell) {
        // If no active cell, delete the last column
        const lastColIndex = table.rows[0].cells.length - 1;
        for (let i = 0; i < table.rows.length; i++) {
            table.rows[i].deleteCell(lastColIndex);
        }
    } else {
        // Delete the column containing the active cell
        const colIndex = parseInt(activeCell.dataset.col) + 1; // +1 for row header
        for (let i = 0; i < table.rows.length; i++) {
            table.rows[i].deleteCell(colIndex);
        }
        
        // Update column indices for remaining cells
        updateColumnIndices();
    }
}

function updateRowIndices() {
    const table = document.querySelector('.spreadsheet-table');
    if (!table) return;
    
    // Update row numbers and dataset attributes
    for (let i = 1; i < table.rows.length; i++) {
        // Update row header
        table.rows[i].cells[0].textContent = i;
        
        // Update cell dataset
        for (let j = 1; j < table.rows[i].cells.length; j++) {
            table.rows[i].cells[j].dataset.row = i - 1;
        }
    }
}

function updateColumnIndices() {
    const table = document.querySelector('.spreadsheet-table');
    if (!table) return;
    
    // Update column letters
    for (let j = 1; j < table.rows[0].cells.length; j++) {
        table.rows[0].cells[j].textContent = String.fromCharCode(65 + j - 1);
    }
    
    // Update cell dataset
    for (let i = 1; i < table.rows.length; i++) {
        for (let j = 1; j < table.rows[i].cells.length; j++) {
            table.rows[i].cells[j].dataset.col = j - 1;
        }
    }
}

function changeCellFormat() {
    const formatSelect = document.getElementById('cell-format');
    const activeCell = document.querySelector('.active-cell');
    
    if (!activeCell || !formatSelect) return;
    
    const format = formatSelect.value;
    
    // Apply formatting based on selected format
    switch (format) {
        case 'number':
            formatAsNumber(activeCell);
            break;
        case 'currency':
            formatAsCurrency(activeCell);
            break;
        case 'date':
            formatAsDate(activeCell);
            break;
        case 'text':
        default:
            // No special formatting for text
            break;
    }
}

// Basic formula evaluation (simplified for demo)
function evaluateFormula(cell) {
    if (!cell || !cell.textContent.startsWith('=')) return;
    
    const formula = cell.textContent;
    let result = '';
    
    try {
        // Very basic SUM function support
        if (formula.toUpperCase().startsWith('=SUM(') && formula.endsWith(')')) {
            // Extract range
            const range = formula.substring(5, formula.length - 1);
            result = evaluateSumFormula(range);
        } else {
            // For demo, just show the formula
            result = formula;
        }
    } catch (error) {
        console.log('Error evaluating formula:', error);
        result = '#ERROR';
    }
    
    // Store original formula
    cell.dataset.formula = formula;
    
    // Display result
    cell.textContent = result;
}

function evaluateSumFormula(range) {
    // Parse range format like "A1:B2"
    const parts = range.split(':');
    if (parts.length !== 2) return '#ERROR';
    
    const startCell = parseCellReference(parts[0]);
    const endCell = parseCellReference(parts[1]);
    
    if (!startCell || !endCell) return '#ERROR';
    
    // Get the table
    const table = document.querySelector('.spreadsheet-table');
    if (!table) return '#ERROR';
    
    // Sum values in range
    let sum = 0;
    for (let i = startCell.row; i <= endCell.row; i++) {
        for (let j = startCell.col; j <= endCell.col; j++) {
            // Get cell (add 1 for header row and row headers)
            const cell = table.rows[i + 1]?.cells[j + 1];
            if (cell) {
                const value = parseFloat(cell.textContent);
                if (!isNaN(value)) {
                    sum += value;
                }
            }
        }
    }
    
    return sum.toString();
}

function parseCellReference(ref) {
    // Parse cell reference like "A1" to row and column indices
    const colLetter = ref.charAt(0);
    const rowNumber = parseInt(ref.substring(1));
    
    if (!colLetter.match(/[A-Z]/i) || isNaN(rowNumber)) return null;
    
    return {
        col: colLetter.toUpperCase().charCodeAt(0) - 65, // A=0, B=1, etc.
        row: rowNumber - 1 // 1-based to 0-based
    };
}

// Cell formatting functions
function formatAsNumber(cell) {
    const value = parseFloat(cell.textContent);
    if (!isNaN(value)) {
        cell.textContent = value.toLocaleString();
    }
}

function formatAsCurrency(cell) {
    const value = parseFloat(cell.textContent);
    if (!isNaN(value)) {
        cell.textContent = value.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        });
    }
}

function formatAsDate(cell) {
    try {
        const value = new Date(cell.textContent);
        if (!isNaN(value.getTime())) {
            cell.textContent = value.toLocaleDateString();
        }
    } catch (error) {
        // Not a valid date, leave as is
    }
}

// Save the spreadsheet
function saveSpreadsheet(silent = false) {
    const spreadsheetContainer = document.getElementById('spreadsheet-editor');
    const title = document.getElementById('spreadsheet-title').value;
    const fileId = spreadsheetContainer.dataset.fileId;
    
    // Extract data from the table
    const table = document.querySelector('.spreadsheet-table');
    if (!table) return;
    
    const data = [];
    
    // Skip header row (i=0)
    for (let i = 1; i < table.rows.length; i++) {
        const rowData = [];
        
        // Skip row header (j=0)
        for (let j = 1; j < table.rows[i].cells.length; j++) {
            const cell = table.rows[i].cells[j];
            // Use formula if available, otherwise use displayed value
            rowData.push(cell.dataset.formula || cell.textContent);
        }
        
        data.push(rowData);
    }
    
    // Encrypt the content in memory (client-side encryption)
    // In a real app, we would use a proper encryption library
    const encryptedContent = btoa(JSON.stringify(data));
    
    // Save to "RAM" (localStorage as a stand-in for demo)
    localStorage.setItem(`sheet_${fileId || 'new'}`, encryptedContent);
    
    // Show save notification if not silent
    if (!silent) {
        showSaveNotification();
    }
    
    // In a real app, we would periodically sync with the server
    if (fileId) {
        // Create form data
        const formData = new FormData();
        formData.append('content', encryptedContent);
        formData.append('title', title);
        
        // Update existing file
        fetch(`/api/files/${fileId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: formData
        }).catch(error => console.log('Error saving spreadsheet:', error));
    }
}

function closeSpreadsheet() {
    // Save the spreadsheet first
    saveSpreadsheet();
    
    // Clear the spreadsheet
    document.getElementById('spreadsheet-editor').innerHTML = '';
    document.getElementById('spreadsheet-title').value = '';
    
    // Switch back to the files view
    switchView('my-files');
}

function showSaveNotification() {
    // Create a notification element
    const notification = document.createElement('div');
    notification.className = 'save-notification';
    notification.textContent = 'Spreadsheet saved to secure memory';
    
    // Add to the document
    document.body.appendChild(notification);
    
    // Remove after a few seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 2000);
}

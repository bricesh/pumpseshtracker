document.addEventListener('DOMContentLoaded', function() {
    // Display current date
    const currentDateElement = document.getElementById('currentDate');
    const today = new Date();
    currentDateElement.textContent = formatFullDate(today);

    // Use Google Sheets Visualization API to get CSV data
    const SHEET_ID = '1tXVmhvaNf9vClVWidGftayzfFK3ZThGhBu1d93BzOrw';
    const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Formularantworten 2`;
    
    // Fetch the CSV data
    fetchCSVData(SHEET_URL);
});

// Fetch CSV data from Google Sheets
function fetchCSVData(url) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(csvText => {
            // Parse CSV data
            const data = parseCSV(csvText);
            // Process and display the data
            processData(data);
        })
        .catch(error => {
            console.error('Error fetching or parsing CSV:', error);
            // Fall back to sample data if there's an error
            const sampleData = generateSampleData();
            processData(sampleData);
        });
}

// Parse CSV text into structured data
function parseCSV(csvText) {
    // Split by new lines and remove any empty lines
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    
    // Skip header row and process data
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        // Handle quoted values correctly (this is simplified and might need more robust parsing for complex CSVs)
        let currentLine = lines[i];
        const values = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let j = 0; j < currentLine.length; j++) {
            const char = currentLine[j];
            
            if (char === '"' && (j === 0 || currentLine[j-1] !== '\\')) {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        // Add the last value
        values.push(currentValue);
        
        // Assuming column order: Datetimestamp, How munch, Power Pump
        if (values.length >= 3) {
            data.push({
                datetime: values[0].replace(/"/g, ''), // Remove any quotes
                amount: values[1].replace(/"/g, ''),   // Remove any quotes
                powerPump: values[2].replace(/"/g, '') // Remove any quotes
            });
        }
    }
    
    return data;
}

// Generate sample data as a fallback
function generateSampleData() {
    const data = [];
    const today = new Date();
    
    // Generate data for today
    for (let i = 0; i < 5; i++) {
        const hour = Math.floor(Math.random() * 14) + 6; // Random hour between 6 and 20
        const minute = Math.floor(Math.random() * 60);
        const dateObj = new Date(today);
        dateObj.setHours(hour, minute);
        
        data.push({
            datetime: formatDateForCSV(dateObj),
            amount: Math.floor(Math.random() * 80) + 40, // Random amount between 40-120ml
            powerPump: Math.random() > 0.7 ? 'Yes' : 'No' // 30% chance of being a power pump
        });
    }
    
    // Generate data for past 6 days
    for (let i = 1; i <= 6; i++) {
        const pastDate = new Date(today);
        pastDate.setDate(today.getDate() - i);
        
        const sessionsCount = Math.floor(Math.random() * 5) + 3; // 3-7 sessions per day
        
        for (let j = 0; j < sessionsCount; j++) {
            const hour = Math.floor(Math.random() * 14) + 6; // Random hour between 6 and 20
            const minute = Math.floor(Math.random() * 60);
            const dateObj = new Date(pastDate);
            dateObj.setHours(hour, minute);
            
            data.push({
                datetime: formatDateForCSV(dateObj),
                amount: Math.floor(Math.random() * 80) + 40, // Random amount between 40-120ml
                powerPump: Math.random() > 0.7 ? 'Yes' : 'No' // 30% chance of being a power pump
            });
        }
    }
    
    return data;
}

// Format date to match the CSV format (DD.MM.YYYY HH:MM)
function formatDateForCSV(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}:00`;
}

// Format date for display in full format (Thursday, May 8, 2025)
function formatFullDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Format date for x-axis labels (8 May)
function formatChartDate(date) {
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    return `${day} ${month}`;
}

// Process the data and update the UI
function processData(data) {
    // Parse dates and sort by newest first
    const parsedData = data.map(item => {
        // Parse DD.MM.YYYY HH:MM format
        const [datePart, timePart] = item.datetime.split(' ');
        const [day, month, year] = datePart.split('.');
        const [hours, minutes] = timePart.split(':');
        
        return {
            date: new Date(`${year}-${month}-${day}T${hours}:${minutes}:00`),
            amount: parseInt(item.amount, 10),
            powerPump: item.powerPump
        };
    }).sort((a, b) => b.date - a.date);
    
    // Filter today's data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayData = parsedData.filter(item => 
        item.date >= today && item.date < tomorrow
    );
    
    // Update today's table
    updateTodayTable(todayData);
    
    // Prepare and display weekly chart
    const weeklyData = prepareWeeklyData(parsedData);
    drawWeeklyChart(weeklyData);
}

// Update the today's table with filtered data
function updateTodayTable(todayData) {
    const tableBody = document.getElementById('todayTableBody');
    const totalElement = document.getElementById('todayTotal');
    const noDataMessage = document.getElementById('noDataMessage');
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (todayData.length === 0) {
        // Show no data message
        noDataMessage.style.display = 'block';
        totalElement.textContent = 'Total: 0 ml';
        return;
    }
    
    // Hide no data message
    noDataMessage.style.display = 'none';
    
    // Calculate total
    const totalAmount = todayData.reduce((sum, item) => sum + item.amount, 0);
    totalElement.textContent = `Total: ${totalAmount} ml`;
    
    // Add rows to table
    todayData.forEach(item => {
        const row = document.createElement('tr');
        
        // Format time (HH:MM)
        const hours = String(item.date.getHours()).padStart(2, '0');
        const minutes = String(item.date.getMinutes()).padStart(2, '0');
        const timeFormatted = `${hours}:${minutes}`;
        
        row.innerHTML = `
            <td>${timeFormatted}</td>
            <td>${item.amount} ml</td>
            <td>${item.powerPump}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Prepare data for weekly chart
function prepareWeeklyData(parsedData) {
    const weeklyData = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Prepare data for the last 7 days
    for (let i = 6; i >= 0; i--) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() - i);
        
        const nextDate = new Date(currentDate);
        nextDate.setDate(currentDate.getDate() + 1);
        
        // Filter data for the current day
        const dayData = parsedData.filter(item => 
            item.date >= currentDate && item.date < nextDate
        );
        
        // Split data into morning (before noon) and afternoon (after noon)
        const morningData = dayData.filter(item => item.date.getHours() < 12);
        const afternoonData = dayData.filter(item => item.date.getHours() >= 12);
        
        // Calculate total amounts for morning and afternoon
        const morningAmount = morningData.reduce((sum, item) => sum + item.amount, 0);
        const afternoonAmount = afternoonData.reduce((sum, item) => sum + item.amount, 0);
        const totalAmount = morningAmount + afternoonAmount;
        
        weeklyData.push({
            date: currentDate,
            morningAmount: morningAmount,
            afternoonAmount: afternoonAmount,
            totalAmount: totalAmount
        });
    }
    
    return weeklyData;
}

// Draw the weekly trend chart as a stacked bar chart
function drawWeeklyChart(weeklyData) {
    const canvas = document.getElementById('weeklyChart');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to container size for responsiveness
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Chart dimensions and padding
    const padding = {
        top: 40,
        right: 20,
        bottom: 40,
        left: 40
    };
    
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    // Find maximum value for scaling
    const maxAmount = Math.max(...weeklyData.map(item => item.totalAmount), 100);
    const yScale = chartHeight / maxAmount;
    
    // Bar width calculation
    const barWidth = chartWidth / weeklyData.length * 0.7;
    const barSpacing = chartWidth / weeklyData.length * 0.3;
    
    // Draw grid lines
    ctx.beginPath();
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (5 lines)
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + chartHeight - (chartHeight / 5 * i);
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
        
        // Y-axis labels
        const labelValue = Math.round(maxAmount / 5 * i);
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '10px "Segoe UI"';
        ctx.textAlign = 'right';
        ctx.fillText(`${labelValue}`, padding.left - 5, y + 3);
    }
    
    // Draw stacked bars
    weeklyData.forEach((item, index) => {
        const x = padding.left + (chartWidth / weeklyData.length * index) + barSpacing / 2;
        
        // Draw afternoon portion (top of stack)
        const afternoonHeight = item.afternoonAmount * yScale;
        const morningHeight = item.morningAmount * yScale;
        
        // Morning portion starts at the bottom
        const morningY = padding.top + chartHeight - morningHeight;
        
        // Afternoon portion starts where morning ends
        const afternoonY = morningY - afternoonHeight;
        
        // Draw morning bar (bottom segment)
        ctx.fillStyle = '#e84393'; // Original pink color for morning
        ctx.fillRect(x, morningY, barWidth, morningHeight);
        
        // Draw afternoon bar (top segment)
        ctx.fillStyle = '#9b59b6'; // Purple color for afternoon
        ctx.fillRect(x, afternoonY, barWidth, afternoonHeight);
        
        // Draw total amount on top of the stacked bar
        if (item.totalAmount > 0) {
            ctx.fillStyle = '#333';
            ctx.font = '12px "Segoe UI"';
            ctx.textAlign = 'center';
            ctx.fillText(`${item.totalAmount}`, x + barWidth / 2, afternoonY - 5);
        }
        
        // Draw date label on x-axis
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '10px "Segoe UI"';
        ctx.fillText(formatChartDate(item.date), x + barWidth / 2, padding.top + chartHeight + 15);
    });
    
    // Draw legend
    drawLegend(ctx, canvas.width, padding.top);
}

// Function to draw chart legend
function drawLegend(ctx, canvasWidth, topPadding) {
    const legendX = canvasWidth - 150;
    const legendY = topPadding - 15;
    const boxSize = 10;
    
    // Morning legend item
    ctx.fillStyle = '#e84393';
    ctx.fillRect(legendX, legendY, boxSize, boxSize);
    ctx.fillStyle = '#333';
    ctx.font = '10px "Segoe UI"';
    ctx.textAlign = 'left';
    ctx.fillText('Morning (AM)', legendX + boxSize + 5, legendY + boxSize - 1);
    
    // Afternoon legend item
    ctx.fillStyle = '#9b59b6';
    ctx.fillRect(legendX, legendY + 15, boxSize, boxSize);
    ctx.fillStyle = '#333';
    ctx.fillText('Afternoon (PM)', legendX + boxSize + 5, legendY + 15 + boxSize - 1);
}
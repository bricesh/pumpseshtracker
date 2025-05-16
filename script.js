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
    
    // Prepare and display bubble chart
    const bubbleData = prepareBubbleData(parsedData);
    drawBubbleChart(bubbleData);
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
        
        // Calculate total amount for the day
        const totalAmount = dayData.reduce((sum, item) => sum + item.amount, 0);
        
        weeklyData.push({
            date: currentDate,
            totalAmount: totalAmount
        });
    }
    
    return weeklyData;
}

// Prepare data for bubble chart
function prepareBubbleData(parsedData) {
    const bubbleData = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get data for the last 7 days
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    
    // Filter data for the last 7 days
    const lastSevenDaysData = parsedData.filter(item => item.date >= sevenDaysAgo);
    
    // Prepare data for bubble chart
    lastSevenDaysData.forEach(item => {
        const hours = item.date.getHours() + item.date.getMinutes() / 60; // Convert to decimal hours
        
        // Determine color based on time of day
        let color;
        if (hours >= 0 && hours < 4) {
            color = "#2E86C1"; // Deep blue
        } else if (hours >= 4 && hours < 8) {
            color = "#3498DB"; // Light blue
        } else if (hours >= 8 && hours < 12) {
            color = "#F1C40F"; // Yellow
        } else if (hours >= 12 && hours < 16) {
            color = "#E67E22"; // Orange
        } else if (hours >= 16 && hours < 20) {
            color = "#CB4335"; // Red
        } else {
            color = "#884EA0"; // Purple
        }
        
        // Create date without time for y-axis
        const dateOnly = new Date(item.date);
        dateOnly.setHours(0, 0, 0, 0);
        
        bubbleData.push({
            x: hours,           // Time of day (decimal hours)
            y: dateOnly,        // Date
            r: Math.sqrt(item.amount) * 1.2, // Size proportional to volume (increased by 50%)
            color: color,       // Color based on time of day
            amount: item.amount, // Original amount for labels
            time: `${String(item.date.getHours()).padStart(2, '0')}:${String(item.date.getMinutes()).padStart(2, '0')}` // Time for tooltip
        });
    });
    
    return bubbleData;
}

// Draw the weekly trend chart
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
    
    // Draw bars
    weeklyData.forEach((item, index) => {
        const x = padding.left + (chartWidth / weeklyData.length * index) + barSpacing / 2;
        const barHeight = item.totalAmount * yScale;
        const y = padding.top + chartHeight - barHeight;
        
        // Draw bar
        ctx.fillStyle = '#e84393';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw total amount on top of the bar
        ctx.fillStyle = '#b83b7c';
        ctx.font = '12px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText(`${item.totalAmount}`, x + barWidth / 2, y - 5);
        
        // Draw date label on x-axis
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '10px "Segoe UI"';
        ctx.fillText(formatChartDate(item.date), x + barWidth / 2, padding.top + chartHeight + 15);
    });
}

// Draw the bubble chart
function drawBubbleChart(bubbleData) {
    const canvas = document.getElementById('bubbleChart');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to container size for responsiveness
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Chart dimensions and padding
    const padding = {
        top: 30,
        right: 20,
        bottom: 40,
        left: 60
    };
    
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    // Get unique dates for y-axis
    const uniqueDates = Array.from(new Set(bubbleData.map(item => item.y.getTime())))
        .map(time => new Date(time))
        .sort((a, b) => a - b); // Sort dates from oldest to newest
    
    // X-axis scale (0-24 hours)
    const xScale = chartWidth / 24;
    
    // Y-axis scale (dates)
    const yScale = chartHeight / (uniqueDates.length || 1); // Avoid division by zero
    
    // Draw grid and axes
    ctx.beginPath();
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    
    // Vertical grid lines (every 4 hours)
    for (let hour = 0; hour <= 24; hour += 4) {
        const x = padding.left + (hour * xScale);
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
        
        // X-axis labels
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '10px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText(`${hour}:00`, x, padding.top + chartHeight + 15);
    }
    
    // Horizontal grid lines (for each date)
    uniqueDates.forEach((date, index) => {
        const y = padding.top + (index * yScale) + (yScale / 2);
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
        
        // Y-axis date labels
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '10px "Segoe UI"';
        ctx.textAlign = 'right';
        ctx.fillText(formatChartDate(date), padding.left - 5, y + 3);
    });
    
    // Store bubble coordinates for tooltip
    const bubbleCoordinates = [];
    
    // Draw bubbles
    bubbleData.forEach(item => {
        // Find the index of the date in our uniqueDates array
        const dateIndex = uniqueDates.findIndex(date => 
            date.getDate() === item.y.getDate() && 
            date.getMonth() === item.y.getMonth() && 
            date.getFullYear() === item.y.getFullYear()
        );
        
        const x = padding.left + (item.x * xScale);
        const y = padding.top + (dateIndex * yScale) + (yScale / 2);
        const radius = Math.max(item.r, 5); // Minimum radius of 5 for visibility
        
        // Draw bubble
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = item.color;
        ctx.fill();
        
        // Add amount text inside bubble if bubble is large enough
        if (radius > 12) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px "Segoe UI"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.amount, x, y);
        }
        
        // Store coordinates for tooltip
        bubbleCoordinates.push({
            x: x,
            y: y,
            radius: radius,
            amount: item.amount,
            time: item.time
        });
    });
    
    // Remove existing tooltip if any
    const existingTooltip = document.getElementById('bubbleChartTooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.id = 'bubbleChartTooltip';
    tooltip.style.cssText = `
        position: fixed;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 9999;
        display: none;
        pointer-events: none;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        font-family: 'Segoe UI', sans-serif;
    `;
    document.body.appendChild(tooltip);
    
    // Add mouse move event to canvas
    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Check if mouse is over any bubble
        let isOverBubble = false;
        
        for (const bubble of bubbleCoordinates) {
            const distance = Math.sqrt(
                Math.pow(mouseX - bubble.x, 2) + 
                Math.pow(mouseY - bubble.y, 2)
            );
            
            if (distance <= bubble.radius) {
                isOverBubble = true;
                
                // Update tooltip content
                tooltip.innerHTML = `Time: ${bubble.time}<br>Amount: ${bubble.amount} ml`;
                
                // Position tooltip near cursor but ensure it's visible
                tooltip.style.left = `${event.clientX + 15}px`;
                tooltip.style.top = `${event.clientY - 15}px`;
                tooltip.style.display = 'block';
                
                // Once we found a bubble, we can break the loop
                break;
            }
        }
        
        if (!isOverBubble) {
            tooltip.style.display = 'none';
        }
    });
    
    // Hide tooltip when mouse leaves canvas
    canvas.addEventListener('mouseout', () => {
        tooltip.style.display = 'none';
    });
}
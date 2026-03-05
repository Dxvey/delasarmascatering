document.addEventListener('DOMContentLoaded', function() {
    loadReportingData();
    
    // Add download button to the reporting grid (not header)
    addPDFButtonToGrid();
    
    // Time range selector
    document.querySelector('.time-select').addEventListener('change', function() {
        loadReportingData(this.value);
    });
});

function addPDFButtonToGrid() {
    // Create PDF button container
    const pdfButtonContainer = document.createElement('div');
    pdfButtonContainer.className = 'pdf-button-container';
    pdfButtonContainer.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 100;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
    `;
    
    // Create the PDF button
    const pdfBtn = document.createElement('button');
    pdfBtn.className = 'download-pdf-btn';
    pdfBtn.innerHTML = '<i class="bx bx-download"></i> Export as PDF';
    pdfBtn.onclick = downloadPDF;
    
    // Style the button
    pdfBtn.style.cssText = `
        background: #19276F;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 15px rgba(25, 39, 111, 0.3);
        transition: all 0.3s ease;
    `;
    
    // Add hover effect
    pdfBtn.addEventListener('mouseenter', function() {
        this.style.background = '#0f1a4a';
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 20px rgba(25, 39, 111, 0.4)';
    });
    
    pdfBtn.addEventListener('mouseleave', function() {
        this.style.background = '#19276F';
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 15px rgba(25, 39, 111, 0.3)';
    });
    
    // Add button to container
    pdfButtonContainer.appendChild(pdfBtn);
    
    // Add to body
    document.body.appendChild(pdfButtonContainer);
}

async function loadReportingData(months = '6') {
    try {
        // Show loading states
        showLoading();
        
        // Fetch all data in parallel
        const [summary, growth, stats, topBuyer] = await Promise.all([
            fetch(`http://localhost:4000/reporting-summary?range=${months}`).then(r => r.json()),
            fetch(`http://localhost:4000/growth-stats?range=${months}`).then(r => r.json()),
            fetch('http://localhost:4000/top-stats').then(r => r.json()),
            fetch('http://localhost:4000/top-buyer').then(r => r.json())
        ]);
        
        // Update UI with real data
        updateStats(summary, stats, topBuyer);
        
        // Update charts with real data
        updateRevenueChart(growth);
        updateDonutChart(stats);
        updateBarChart(growth);
        
    } catch (error) {
        console.error("Error loading reporting data:", error);
        showError();
    }
}

function updateStats(summary, stats, topBuyer) {
    // Update total revenue
    document.querySelector('.revenue-main-card h1').textContent = 
        `₱ ${parseFloat(summary.totalRevenue || 0).toLocaleString()}`;
    
    // Update events serviced
    document.querySelectorAll('.stat-card h2')[0].textContent = 
        (summary.eventsServiced || 0).toLocaleString();
    
    // Update profits earned
    document.querySelectorAll('.stat-card h2')[1].textContent = 
        `₱ ${parseFloat(summary.estimatedProfits || 0).toLocaleString()}`;
    
    // Update managed count (using total events)
    document.getElementById('managedCountLabel').textContent = 
        (stats.totalBookings || 0).toLocaleString();
    
    // Update donut chart legend
    const otherCount = Math.max(0, (summary.eventsServiced || 0) - (stats.totalBookings || 0));
    const otherLabel = document.querySelectorAll('.legend-number')[1];
    if (otherLabel) otherLabel.textContent = otherCount.toLocaleString();
}

function updateRevenueChart(data) {
    if (!data || data.length === 0) return;
    
    const svg = document.querySelector('.revenue-svg');
    const pathPurple = document.getElementById('pathPurple');
    const pathGreen = document.getElementById('pathGreen');
    const xLabels = document.getElementById('revenueXLabels');
    
    // Clear old labels
    xLabels.innerHTML = '';
    
    // Calculate points for the path
    const width = 570; // SVG width minus margins
    const height = 160; // SVG height minus margins
    const points = [];
    const forecastPoints = [];
    
    const maxValue = Math.max(...data.map(d => d.total || 0)) * 1.2 || 100;
    
    data.forEach((item, index) => {
        const x = 30 + (index * (width / (data.length - 1 || 1)));
        const y = 180 - ((item.total / maxValue) * 120);
        points.push(`${x},${y}`);
        
        // Add forecast (slightly higher for demo)
        const forecastY = 180 - (((item.total || 0) * 1.1 / maxValue) * 120);
        forecastPoints.push(`${x},${forecastY}`);
        
        // Add x-axis labels
        const label = document.createElement('span');
        label.textContent = item.label || '';
        xLabels.appendChild(label);
    });
    
    // Update paths
    if (pathPurple) {
        pathPurple.setAttribute('d', `M${points.join(' L')}`);
    }
    if (pathGreen) {
        pathGreen.setAttribute('d', `M${forecastPoints.join(' L')}`);
    }
    
    // Update Y-axis labels
    const yLabels = document.querySelector('.y-labels');
    if (yLabels) {
        yLabels.innerHTML = `
            <span>₱${(maxValue).toLocaleString()}</span>
            <span>₱${(maxValue/2).toLocaleString()}</span>
            <span>₱0</span>
        `;
    }
}

function updateDonutChart(stats) {
    const purpleCircle = document.getElementById('purpleDonutCircle');
    const greenCircle = document.getElementById('greenDonutCircle');
    
    if (!purpleCircle || !greenCircle) return;
    
    const total = stats.totalBookings || 0;
    const maxTotal = 100; // Assuming max 100 events for the donut
    
    // Calculate percentages
    const managedPercent = Math.min(100, (total / maxTotal) * 100);
    const otherPercent = 100 - managedPercent;
    
    // Calculate dash arrays (circumference = 2πr ≈ 251.3 for r=40)
    const purpleDash = (managedPercent / 100) * 251.3;
    const greenDash = (otherPercent / 100) * 144.5;
    
    purpleCircle.style.strokeDasharray = `${purpleDash} 251.3`;
    greenCircle.style.strokeDasharray = `${greenDash} 144.5`;
}

function updateBarChart(data) {
    if (!data || data.length === 0) return;
    
    const bars = document.querySelectorAll('.bar-col .bar');
    const days = ['M', 'T', 'W', 'Th', 'F', 'S'];
    
    // Get last 6 data points or use sample data
    const values = data.slice(-6).map(d => d.total || 0);
    const maxValue = Math.max(...values, 1);
    
    bars.forEach((bar, index) => {
        if (index < values.length) {
            const height = (values[index] / maxValue) * 100;
            bar.style.height = `${Math.max(5, height)}%`;
        }
        
        // Update day labels
        const daySpan = bar.closest('.bar-col')?.querySelector('span');
        if (daySpan && index < days.length) {
            daySpan.textContent = days[index];
        }
    });
    
    // Update Y-axis
    const yAxis = document.querySelector('.bar-y-axis');
    if (yAxis) {
        yAxis.innerHTML = `
            <span>${Math.round(maxValue).toLocaleString()}</span>
            <span>${Math.round(maxValue*2/3).toLocaleString()}</span>
            <span>${Math.round(maxValue/3).toLocaleString()}</span>
            <span>0</span>
        `;
    }
}

function showLoading() {
    document.querySelector('.revenue-main-card h1').textContent = 'Loading...';
    document.querySelectorAll('.stat-card h2').forEach(el => el.textContent = '...');
}

function showError() {
    document.querySelector('.revenue-main-card h1').textContent = 'Error loading data';
}

// PDF Download Function
async function downloadPDF() {
    try {
        // Show loading indicator
        const downloadBtn = document.querySelector('.download-pdf-btn');
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Generating PDF...';
        downloadBtn.disabled = true;
        
        // Get the reporting grid element
        const element = document.querySelector('.reporting-grid');
        
        // Temporarily hide the PDF button for clean screenshot
        const pdfButton = document.querySelector('.pdf-button-container');
        if (pdfButton) pdfButton.style.display = 'none';
        
        // Create a clone for PDF generation
        const clone = element.cloneNode(true);
        
        // Style the clone for PDF
        clone.style.width = '1200px';
        clone.style.padding = '20px';
        clone.style.background = 'white';
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '0';
        
        document.body.appendChild(clone);
        
        // Generate PDF
        const canvas = await html2canvas(clone, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
            allowTaint: true,
            useCORS: true
        });
        
        document.body.removeChild(clone);
        
        // Restore PDF button visibility
        if (pdfButton) pdfButton.style.display = 'flex';
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width * 0.75, canvas.height * 0.75]
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width * 0.75, canvas.height * 0.75);
        
        // Add metadata
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        pdf.setProperties({
            title: `De Las Armas Report - ${dateStr}`,
            subject: 'Financial Report',
            author: 'De Las Armas Catering',
            keywords: 'revenue, sales, catering',
            creator: 'De Las Armas System'
        });
        
        // Save the PDF
        pdf.save(`De-Las-Armas-Report-${today.toISOString().split('T')[0]}.pdf`);
        
        // Restore button
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
        
    } catch (error) {
        console.error("PDF generation error:", error);
        alert("Failed to generate PDF. Please try again.");
        
        const downloadBtn = document.querySelector('.download-pdf-btn');
        downloadBtn.innerHTML = '<i class="bx bx-download"></i> Export as PDF';
        downloadBtn.disabled = false;
        
        // Restore PDF button visibility
        const pdfButton = document.querySelector('.pdf-button-container');
        if (pdfButton) pdfButton.style.display = 'flex';
    }
}

// Add this CSS to ensure logo stays
const style = document.createElement('style');
style.textContent = `
    .bottom-right-logo {
        position: relative;
        width: 100%;
        max-width: 150px;
        z-index: 90;
    }
    
    .pdf-button-container {
        position: absolute;
        left: 100px;
        bottom: 100px;
    }
    
    .download-pdf-btn {
        background: #19276F;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 15px rgba(25, 39, 111, 0.3);
    }

    
    .download-pdf-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .bx-spin {
        animation: spin 1s linear infinite;
    }
`;
document.head.appendChild(style);
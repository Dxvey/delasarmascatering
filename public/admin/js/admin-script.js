async function handleLogin(e) {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;

    try {
        const response = await fetch('http://localhost:4000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            window.location.href = 'dashboard.html';
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Admin server unreachable.");
    }
}

// Functions for the Dashboard (Global Scope for HTML onclicks)
window.changeSort = async function(e, type) {
    if (e) e.preventDefault();
    const sortText = document.getElementById('currentSort');
    if (sortText) sortText.innerHTML = (type === 'newest' ? "Sort by Newest" : "Sort by Oldest") + " <i class='bx bx-chevron-down'></i>";
    await loadLatestCustomers(type);
};

window.changeGrowthFilter = async function(e, filterType) {
    if (e) e.preventDefault();
    const growthText = document.getElementById('growthSortText');
    if (growthText) growthText.innerHTML = filterType.charAt(0).toUpperCase() + filterType.slice(1) + " <i class='bx bx-chevron-down'></i>";
    await updateGrowthChart(filterType);
};

// Initialize page logic based on which elements exist
document.addEventListener('DOMContentLoaded', () => {
    
    // Check if we are on the login page
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Check if we are on the dashboard
    if (document.getElementById('revenuePercent')) {
        loadRevenueCard();
        loadLatestCustomers('newest');
        updateGrowthChart('yearly');
        loadTopStats();
        loadTopBuyer();
    }

    // Sidebar Active state logic
    const customerItems = document.querySelectorAll('.customer-item');
    customerItems.forEach(item => {
        item.addEventListener('click', function() {
            customerItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
});

// --- API Fetching Functions ---

async function loadRevenueCard() {
    try {
        const res = await fetch('http://localhost:4000/dashboard');
        const data = await res.json();
        const percentEl = document.getElementById('revenuePercent');
        const arrowEl = document.getElementById('revenueArrow');
        const textEl = document.getElementById('revenueText');
        if (!percentEl) return;

        const value = Number(data.percentage) || 0;
        percentEl.textContent = Math.abs(value) + '%';
        if (value > 0) {
            arrowEl.className = 'bx bx-up-arrow-alt arrow-icon';
            percentEl.style.color = '#2ecc71';
        } else if (value < 0) {
            arrowEl.className = 'bx bx-down-arrow-alt arrow-icon';
            percentEl.style.color = '#e74c3c';
        }
    } catch (err) { console.error('Revenue load failed', err); }
}

async function loadLatestCustomers(order = 'newest') {
    try {
        const res = await fetch(`http://localhost:4000/latest-customers?order=${order}`);
        const users = await res.json();
        const listContainer = document.getElementById('dynamicCustomerList');
        if (!listContainer) return;
        listContainer.innerHTML = '';
        users.forEach(user => {
            const dateObj = new Date(user.verification_date);
            const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const li = document.createElement('li');
            li.className = 'customer-item';
            li.innerHTML = `
                <img src="img/Avatar 2.png" alt="User">
                <div class="customer-info"><h4>${user.fName}</h4><p>${formattedDate}</p></div>
                <div class="actions">
                    <div class="separator"></div> <i class='bx bx-dots-vertical-rounded'></i>
                </div>
            `;
            listContainer.appendChild(li);
        });
    } catch (err) { console.error('Failed to load customers', err); }
}

let chartPoints = []; // Stores data for hover tracking

async function updateGrowthChart(filter = 'yearly') {
    try {
        const res = await fetch(`http://localhost:4000/growth-stats?filter=${filter}`);
        const data = await res.json();
        
        const gLine = document.getElementById('growthLine');
        const gArea = document.getElementById('growthArea');
        const xAxisContainer = document.getElementById('growth-x-labels');
        const chartArea = document.querySelector('.chart-area');

        if (!gLine || !gArea || !data || data.length === 0) return;

        const width = 600;
        const height = 200;
        
        // Find highest sale to scale the graph height
        const maxSales = Math.max(...data.map(d => parseFloat(d.total || 0)), 1) * 1.3;

        let lp = ""; // Line Path
        let ap = ""; // Area Path
        chartPoints = []; // Reset for new data
        xAxisContainer.innerHTML = ""; 

        data.forEach((point, i) => {
            const labelText = point.label || "---";
            const val = parseFloat(point.total || 0);
            
            // Math for X and Y coordinates
            const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
            const y = height - (val / maxSales) * height;

            // Save for the hover logic later
            chartPoints.push({ x, y, label: labelText, value: val });

            // Build SVG Path strings
            if (i === 0) {
                lp += `M ${x} ${y} `;
                ap += `M ${x} ${height} L ${x} ${y} `;
            } else {
                lp += `L ${x} ${y} `;
                ap += `L ${x} ${y} `;
            }

            // Create X-axis labels (Jan, Feb, etc.)
            const span = document.createElement('span');
            span.textContent = labelText;
            xAxisContainer.appendChild(span);
        });

        // Close the Area Path (bottom of the chart)
        ap += `L ${width} ${height} L 0 ${height} Z`;

        // Apply paths to the SVG
        gLine.setAttribute('d', lp);
        gArea.setAttribute('d', ap);

        // --- HOVER ACTION ---
        chartArea.onmousemove = (e) => {
            const rect = chartArea.getBoundingClientRect();
            // Scale mouse position to the 600-unit SVG grid
            const mouseX = (e.clientX - rect.left) * (width / rect.width);
            
            // Find the point closest to where the mouse is horizontally
            const closest = chartPoints.reduce((prev, curr) => 
                Math.abs(curr.x - mouseX) < Math.abs(prev.x - mouseX) ? curr : prev
            );

            const tooltip = document.getElementById('chart-tooltip');
            const hLine = document.getElementById('hover-line');

            if (tooltip && hLine) {
                tooltip.style.opacity = "1";
                // Convert SVG coordinates back to percentage for CSS positioning
                tooltip.style.left = `${(closest.x / width) * 100}%`;
                tooltip.style.top = `${(closest.y / height) * 100}%`;
                
                // Show the Sales Record inside the tooltip
                tooltip.innerHTML = `
                    <div style="font-weight:bold; border-bottom:1px solid rgba(255,255,255,0.2); margin-bottom:4px;">${closest.label}</div>
                    <div>Sales: ₱${closest.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                `;

                hLine.style.opacity = "1";
                hLine.style.left = `${(closest.x / width) * 100}%`;
            }
        };

        chartArea.onmouseleave = () => {
            document.getElementById('chart-tooltip').style.opacity = "0";
            document.getElementById('hover-line').style.opacity = "0";
        };

    } catch (err) {
        console.error("Chart Error:", err);
    }
}

async function loadTopStats() {
    try {
        const res = await fetch('http://localhost:4000/top-stats');
        const data = await res.json();
        
        // 1. Top Month Card
        const mName = document.getElementById('topMonthName');
        const mYear = document.getElementById('topMonthYear'); // This is the "----" indicator
        
        if (mName) mName.textContent = data.topMonth;
        if (mYear) mYear.textContent = data.topMonthYear; // Fills the year indicator

        // 2. Top Year Card
        const yValue = document.getElementById('topYearValue');
        const yBookings = document.getElementById('topYearBookings');
        
        if (yValue) yValue.textContent = data.overallTopYear;
        if (yBookings) {
            yBookings.textContent = `${data.totalBookings} Booking${data.totalBookings === 1 ? '' : 's'} so far`;
        }
    } catch (err) {
        console.error("Frontend Top Stats Error:", err);
    }
}

async function loadTopBuyer() {
    try {
        const res = await fetch('http://localhost:4000/top-buyer');
        const data = await res.json();
        
        // Find the HTML elements by their ID and update them
        document.getElementById('topBuyerName').textContent = data.fName;
        document.getElementById('topBuyerAmount').textContent = `₱${data.totalSpent.toLocaleString()}`;
    } catch (err) {
        console.log("Error loading top buyer:", err);
    }
}

    function toggleProfileMenu(event) {
        event.stopPropagation();
        document.getElementById('profileMenu').classList.toggle('show');
    }

    window.onclick = function(event) {
        if (!event.target.closest('.profile')) {
            const dropdown = document.getElementById('profileMenu');
            if (dropdown && dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
            }
        }
        if (event.target.classList.contains('center-modal-overlay')) {
            event.target.classList.remove('active');
        }
    }

    function toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('show-sidebar');
    }

    document.addEventListener('DOMContentLoaded', function() {
        const editProfileBtn = document.getElementById('editProfileBtn');
        const changeNameBtn = document.getElementById('changeNameBtn');
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        const editProfileModal = document.getElementById('editProfileModal');
        const changeNameModal = document.getElementById('changeNameModal');
        const changePasswordModal = document.getElementById('changePasswordModal');
        const closeBtns = document.querySelectorAll('.close-modal');
        const profileMenu = document.getElementById('profileMenu');

        function openCenterModal(modal) {
            profileMenu.classList.remove('show');
            modal.classList.add('active');
        }

        editProfileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openCenterModal(editProfileModal);
        });

        changeNameBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openCenterModal(changeNameModal);
        });

        changePasswordBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openCenterModal(changePasswordModal);
        });

        closeBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.center-modal-overlay').classList.remove('active');
            });
        });
    });

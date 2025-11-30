document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const analyzeBtn = document.getElementById('analyze-btn');
    const addRowBtn = document.getElementById('add-row-btn');
    const addColBtn = document.getElementById('add-col-btn');
    const delColBtn = document.getElementById('del-col-btn');
    const clearBtn = document.getElementById('clear-btn');
    
    const tableHeadRow = document.getElementById('header-row');
    const tableBody = document.querySelector('#data-table tbody');
    
    const graphTitle = document.getElementById('graph-title');
    const xAxisLabel = document.getElementById('x-axis-label');
    const yAxisLabel = document.getElementById('y-axis-label');
    const graphWidth = document.getElementById('graph-width');
    const graphHeight = document.getElementById('graph-height');
    
    // Annotation Controls
    const annotationModeToggle = document.getElementById('annotation-mode-toggle');
    const annColor = document.getElementById('ann-color');
    const annSize = document.getElementById('ann-size');
    
    const plotDiv = document.getElementById('plot-div');
    const placeholderText = document.querySelector('.placeholder-text');
    const statsContainer = document.getElementById('stats-container');
    const intersectTime = document.getElementById('intersect-time');
    const intersectVoltage = document.getElementById('intersect-voltage');

    // --- State ---
    let columnCount = 3;

    // --- Initialization ---
    initTable();

    function initTable() {
        // Default headers
        const defaults = ['Time (s)', 'Charge (V)', 'Discharge (V)'];
        tableHeadRow.innerHTML = '';
        for(let i=0; i<columnCount; i++) {
            const th = document.createElement('th');
            const input = document.createElement('input');
            input.type = 'text';
            input.value = defaults[i] || `Col ${i+1}`;
            input.className = 'header-input';
            th.appendChild(input);
            tableHeadRow.appendChild(th);
        }
        // Action header
        const thAction = document.createElement('th');
        thAction.innerText = 'Action';
        tableHeadRow.appendChild(thAction);

        // Sample Data
        const sampleData = [
            [0.0, 0.00, 10.00],
            [1.0, 6.32, 3.68],
            [2.0, 8.65, 1.35],
            [3.0, 9.50, 0.50],
            [4.0, 9.82, 0.18],
            [5.0, 9.93, 0.07]
        ];

        tableBody.innerHTML = '';
        sampleData.forEach(row => {
            addRow(row);
        });
    }

    // --- Table Functions ---
    function addRow(values = []) {
        const tr = document.createElement('tr');
        for(let i=0; i<columnCount; i++) {
            const td = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'number';
            input.step = 'any';
            input.className = 'cell-input';
            input.value = values[i] !== undefined ? values[i] : '';
            td.appendChild(input);
            tr.appendChild(td);
        }
        
        // Delete button
        const tdAction = document.createElement('td');
        const btn = document.createElement('button');
        btn.innerHTML = '&times;';
        btn.className = 'delete-btn';
        btn.title = 'Remove Row';
        btn.onclick = () => tr.remove();
        tdAction.appendChild(btn);
        tr.appendChild(tdAction);

        tableBody.appendChild(tr);
    }

    function addColumn() {
        columnCount++;
        
        // Add header
        const th = document.createElement('th');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = `Col ${columnCount}`;
        input.className = 'header-input';
        th.appendChild(input);
        // Insert before Action column
        tableHeadRow.insertBefore(th, tableHeadRow.lastElementChild);

        // Add cell to existing rows
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const td = document.createElement('td');
            const cellInput = document.createElement('input');
            cellInput.type = 'number';
            cellInput.step = 'any';
            cellInput.className = 'cell-input';
            td.appendChild(cellInput);
            // Insert before Action cell
            row.insertBefore(td, row.lastElementChild);
        });
    }

    function removeColumn() {
        if (columnCount <= 1) {
            alert("Cannot have fewer than 1 column.");
            return;
        }
        columnCount--;
        
        // Remove header (second to last child, before Action)
        tableHeadRow.children[tableHeadRow.children.length - 2].remove();

        // Remove cell from rows
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            row.children[row.children.length - 2].remove();
        });
    }

    // --- Event Listeners ---
    addRowBtn.addEventListener('click', addRow);
    addColBtn.addEventListener('click', addColumn);
    delColBtn.addEventListener('click', removeColumn);
    clearBtn.addEventListener('click', () => {
        tableBody.innerHTML = '';
        for(let i=0; i<5; i++) addRow();
    });

    // --- Graph Resizing ---
    function resizeGraph() {
        const w = parseInt(graphWidth.value) || 800;
        const h = parseInt(graphHeight.value) || 500;
        
        plotDiv.style.width = w + 'px';
        plotDiv.style.height = h + 'px';
        
        Plotly.Plots.resize(plotDiv);
    }

    graphWidth.addEventListener('change', resizeGraph);
    graphHeight.addEventListener('change', resizeGraph);

    // --- Analysis ---
    analyzeBtn.addEventListener('click', async () => {
        // Collect Headers
        const headers = [];
        tableHeadRow.querySelectorAll('.header-input').forEach(input => {
            headers.push(input.value);
        });

        // Collect Data
        const data = [];
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const rowData = [];
            let hasData = false;
            row.querySelectorAll('.cell-input').forEach(input => {
                const val = input.value;
                rowData.push(val);
                if(val !== '') hasData = true;
            });
            if(hasData) data.push(rowData);
        });

        if (data.length === 0) {
            alert('Please enter data.');
            return;
        }

        // Send Request
        analyzeBtn.textContent = 'Processing...';
        analyzeBtn.disabled = true;

        try {
            const response = await fetch('https://mathplots.onrender.com', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    data: data,
                    headers: headers,
                    title: graphTitle.value,
                    axis_labels: {
                        x: xAxisLabel.value,
                        y: yAxisLabel.value
                    }
                })
            });

            const result = await response.json();

            if (response.ok) {
                renderPlot(result);
                
                if (result.intersection) {
                    intersectTime.textContent = result.intersection.time;
                    intersectVoltage.textContent = result.intersection.voltage;
                    statsContainer.style.display = 'block';
                } else {
                    statsContainer.style.display = 'none';
                }
            } else {
                alert('Error: ' + result.error);
            }

        } catch (error) {
            console.error(error);
            alert('Network error.');
        } finally {
            analyzeBtn.textContent = 'Generate Graph';
            analyzeBtn.disabled = false;
        }
    });

    // --- Plotly Rendering ---
    function renderPlot(data) {
        placeholderText.style.display = 'none';
        plotDiv.style.display = 'block';
        
        // Apply dimensions
        const w = parseInt(graphWidth.value) || 800;
        const h = parseInt(graphHeight.value) || 500;
        plotDiv.style.width = w + 'px';
        plotDiv.style.height = h + 'px';

        const traces = [];
        
        // Data Traces
        // Data Traces
        data.series.forEach((series, index) => {
            const color = index === 0 ? '#1f77b4' : '#ff7f0e'; // Default colors for first 2 series

            // 1. Smooth Line Trace
            traces.push({
                x: series.smooth_x,
                y: series.smooth_y,
                mode: 'lines',
                name: series.name,
                line: { width: 3, color: color, shape: 'linear' }, // Linear because data is already smooth
                showlegend: true,
                hoverinfo: 'skip' // Skip hover on the line itself to avoid clutter
            });

            // 2. Raw Markers Trace
            traces.push({
                x: data.x_data,
                y: series.data,
                mode: 'markers',
                name: series.name + ' (Points)',
                marker: { size: 8, color: color },
                showlegend: false, // Hide duplicate legend
                hovertemplate: '%{y:.2f} V<extra></extra>'
            });
        });

        // Intersection Trace
        if (data.intersection) {
            traces.push({
                x: [data.intersection.time],
                y: [data.intersection.voltage],
                mode: 'markers+text',
                name: 'Intersection',
                marker: { size: 12, color: 'black', symbol: 'circle-open', line: {width: 2} },
                text: [`(${data.intersection.time}, ${data.intersection.voltage})`],
                textposition: 'top right',
                showlegend: false
            });
        }

        const layout = {
            title: {
                text: data.layout.title,
                font: { size: 24 }
            },
            xaxis: {
                title: data.layout.xaxis.title,
                showgrid: true,
                zeroline: true
            },
            yaxis: {
                title: data.layout.yaxis.title,
                showgrid: true,
                zeroline: true
            },
            hovermode: 'closest',
            dragmode: 'zoom', // Default to zoom
            showlegend: true
        };

        const config = {
            responsive: true,
            editable: true, // Allows editing title, axis labels, and annotations
            scrollZoom: true,
            displayModeBar: true,
            modeBarButtons: [
                ['zoom2d', 'pan2d', 'select2d', 'lasso2d'],
                ['zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d'],
                ['hoverClosestCartesian', 'hoverCompareCartesian']
            ]
        };

        Plotly.newPlot('plot-div', traces, layout, config);

        // Click to Annotate Handler
        const plotElement = document.getElementById('plot-div');
        plotElement.on('plotly_click', function(data){
            if (!annotationModeToggle.checked) return;

            const point = data.points[0];
            const x = point.x;
            const y = point.y;
            
            const newAnnotation = {
                x: x,
                y: y,
                text: 'New Text',
                showarrow: true,
                arrowhead: 2,
                ax: 0,
                ay: -40,
                font: {
                    color: annColor.value,
                    size: parseInt(annSize.value)
                },
                captureevents: true // Allows dragging
            };

            // Add annotation without overwriting existing ones
            const currentLayout = plotElement.layout;
            const currentAnnotations = currentLayout.annotations || [];
            currentAnnotations.push(newAnnotation);
            
            Plotly.relayout('plot-div', { annotations: currentAnnotations });
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const analyzeBtn = document.getElementById('analyze-btn');
    const addRowBtn = document.getElementById('add-row-btn');
    const addColBtn = document.getElementById('add-col-btn');
    const delColBtn = document.getElementById('del-col-btn');
    const mergeBtn = document.getElementById('merge-btn');
    const clearBtn = document.getElementById('clear-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const settingsToggleBtn = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    const tableContainer = document.querySelector('.table-container');

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

    // --- Resize Observer for Graph ---
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            Plotly.Plots.resize(plotDiv);

            // Update inputs to match new size
            const rect = entry.contentRect;
            if (Math.abs(rect.width - (parseInt(graphWidth.value) || 0)) > 2) {
                graphWidth.value = Math.round(rect.width);
            }
            if (Math.abs(rect.height - (parseInt(graphHeight.value) || 0)) > 2) {
                graphHeight.value = Math.round(rect.height);
            }
        }
    });
    resizeObserver.observe(document.getElementById('plot-container'));

    // --- State ---
    let columnCount = 3;

    // --- Initialization ---
    // --- Initialization ---
    initTheme();
    initTable();

    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        // Update icon
        const icon = themeToggleBtn.querySelector('.icon');
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';

        // Update Plotly if it exists
        if (plotDiv.data) {
            const layoutUpdate = {
                paper_bgcolor: theme === 'dark' ? '#1e293b' : '#ffffff',
                plot_bgcolor: theme === 'dark' ? '#1e293b' : '#ffffff',
                font: { color: theme === 'dark' ? '#f1f5f9' : '#1e293b' }
            };
            Plotly.relayout(plotDiv, layoutUpdate);
        }
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    settingsToggleBtn.addEventListener('click', () => {
        settingsPanel.classList.toggle('collapsed');
        tableContainer.classList.toggle('expanded-table');

        if (settingsPanel.classList.contains('collapsed')) {
            settingsToggleBtn.textContent = 'Show Settings';
        } else {
            settingsToggleBtn.textContent = 'Hide Settings';
        }
    });

    function initTable() {
        // Default headers
        const defaults = ['Time (s)', 'Charge (V)', 'Discharge (V)'];
        tableHeadRow.innerHTML = '';
        for (let i = 0; i < columnCount; i++) {
            const th = document.createElement('th');
            const input = document.createElement('input');
            input.type = 'text';
            input.value = defaults[i] || `Col ${i + 1}`;
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
        for (let i = 0; i < columnCount; i++) {
            const td = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'number';
            input.step = 'any';
            input.className = 'cell-input';
            input.value = values[i] !== undefined ? values[i] : '';

            // Excel-like features
            input.addEventListener('keydown', handleKeydown);
            input.addEventListener('paste', handlePaste);
            input.addEventListener('mousedown', handleCellClick);

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

            // Excel-like features
            cellInput.addEventListener('keydown', handleKeydown);
            cellInput.addEventListener('paste', handlePaste);
            cellInput.addEventListener('mousedown', handleCellClick);

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
        for (let i = 0; i < 5; i++) addRow();
    });

    mergeBtn.addEventListener('click', mergeCells);

    // --- Excel-like Functions ---
    function handleKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const currentInput = e.target;
            const currentTd = currentInput.parentElement;
            const currentTr = currentTd.parentElement;
            const cellIndex = Array.from(currentTr.children).indexOf(currentTd);

            const nextTr = currentTr.nextElementSibling;
            if (nextTr) {
                const nextTd = nextTr.children[cellIndex];
                if (nextTd) {
                    const nextInput = nextTd.querySelector('input');
                    if (nextInput) nextInput.focus();
                }
            } else {
                // Add new row if at bottom
                addRow();
                const newTr = tableBody.lastElementChild;
                const newTd = newTr.children[cellIndex];
                if (newTd) {
                    const newInput = newTd.querySelector('input');
                    if (newInput) newInput.focus();
                }
            }
        } else if (e.key.startsWith('Arrow')) {
            // Basic navigation logic could go here, but browser default handles left/right inside input.
            // Up/Down could be added similar to Enter.
            const currentInput = e.target;
            const currentTd = currentInput.parentElement;
            const currentTr = currentTd.parentElement;
            const cellIndex = Array.from(currentTr.children).indexOf(currentTd);

            if (e.key === 'ArrowDown') {
                const nextTr = currentTr.nextElementSibling;
                if (nextTr) {
                    const nextTd = nextTr.children[cellIndex];
                    if (nextTd) nextTd.querySelector('input')?.focus();
                }
            } else if (e.key === 'ArrowUp') {
                const prevTr = currentTr.previousElementSibling;
                if (prevTr) {
                    const prevTd = prevTr.children[cellIndex];
                    if (prevTd) prevTd.querySelector('input')?.focus();
                }
            }
        }
    }

    function handlePaste(e) {
        e.preventDefault();
        const clipboardData = (e.clipboardData || window.clipboardData).getData('text');
        const rows = clipboardData.split(/\r\n|\n|\r/);

        const currentInput = e.target;
        const currentTd = currentInput.parentElement;
        const currentTr = currentTd.parentElement;

        let tr = currentTr;

        rows.forEach((rowStr, rIndex) => {
            if (!rowStr.trim()) return;
            const cells = rowStr.split('\t');

            if (!tr) {
                addRow();
                tr = tableBody.lastElementChild;
            }

            let td = currentTd;
            // If not the first row of paste, start from the same column index
            if (rIndex > 0) {
                const startColIndex = Array.from(currentTr.children).indexOf(currentTd);
                td = tr.children[startColIndex];
            }

            cells.forEach((cellData, cIndex) => {
                if (td) {
                    const input = td.querySelector('input');
                    if (input) input.value = cellData.trim();
                    td = td.nextElementSibling;
                    // Skip action column if reached
                    if (td && !td.querySelector('input')) td = null;
                }
            });

            tr = tr.nextElementSibling;
        });
    }

    // --- Merge Logic ---
    let selectedCells = [];

    function handleCellClick(e) {
        if (e.ctrlKey || e.metaKey) {
            // Toggle selection
            const cell = e.target.parentElement; // td
            if (selectedCells.includes(cell)) {
                cell.classList.remove('cell-selected');
                selectedCells = selectedCells.filter(c => c !== cell);
            } else {
                cell.classList.add('cell-selected');
                selectedCells.push(cell);
            }
        } else {
            // Clear selection if not holding Ctrl
            // But we want to allow normal clicking to edit. 
            // So maybe only clear if we click outside? 
            // Or just have a "Clear Selection" button?
            // For now, let's just clear if we click without Ctrl, but AFTER the click action?
            // Actually, standard behavior is click clears others.
            // But we need to edit.
            // Let's say: Ctrl+Click adds to selection.
            // If we want to clear, maybe the Clear button does it?
            // Or just clicking elsewhere clears it?
            // Let's keep it simple: Ctrl+Click toggles.
            // If you click without Ctrl, it clears previous selection (unless it's the same cell).
            if (selectedCells.length > 0) {
                selectedCells.forEach(c => c.classList.remove('cell-selected'));
                selectedCells = [];
            }
            // Add current if we want to start a drag? No, let's stick to Ctrl+Click for multi-select for now.
            // Or maybe Shift+Click?
            // Let's just use Ctrl+Click for simplicity in this version.
        }
    }

    function mergeCells() {
        if (selectedCells.length < 2) {
            alert("Select at least 2 cells to merge (Ctrl+Click).");
            return;
        }

        // Sort cells by position (row then col)
        // This is complex because we need to know their coordinates.
        // Simplified: only allow merging in the same row.

        const firstCell = selectedCells[0];
        const row = firstCell.parentElement;

        // Verify all in same row
        const allInSameRow = selectedCells.every(c => c.parentElement === row);
        if (!allInSameRow) {
            alert("Can only merge cells in the same row.");
            return;
        }

        // Sort by index
        const cellsInRow = Array.from(row.children);
        selectedCells.sort((a, b) => cellsInRow.indexOf(a) - cellsInRow.indexOf(b));

        // Check adjacency
        for (let i = 0; i < selectedCells.length - 1; i++) {
            const idx1 = cellsInRow.indexOf(selectedCells[i]);
            const idx2 = cellsInRow.indexOf(selectedCells[i + 1]);
            if (idx2 !== idx1 + 1) {
                alert("Cells must be adjacent.");
                return;
            }
        }

        // Merge
        const totalColSpan = selectedCells.reduce((sum, cell) => sum + (parseInt(cell.getAttribute('colspan')) || 1), 0);
        const targetCell = selectedCells[0];
        targetCell.setAttribute('colspan', totalColSpan);

        // Remove others
        for (let i = 1; i < selectedCells.length; i++) {
            selectedCells[i].remove();
        }

        // Clear selection
        selectedCells.forEach(c => c.classList.remove('cell-selected'));
        selectedCells = [];
    }

    // --- Graph Resizing ---
    // --- Graph Resizing ---
    function resizeGraph() {
        const w = parseInt(graphWidth.value) || 800;
        const h = parseInt(graphHeight.value) || 500;
        const container = document.getElementById('plot-container');

        container.style.width = w + 'px';
        container.style.height = h + 'px';

        // Plotly resize will be handled by Observer
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

            // We need to handle colspan. 
            // If a cell has colspan N, we replicate the value N times?
            // Or we just take the value once and fill others with null?
            // For plotting, usually we want x, y1, y2...
            // If we merge, it implies the value applies to multiple columns or it's just a visual grouping.
            // Let's replicate the value for now to keep arrays aligned.

            const cells = Array.from(row.children);
            // Filter out the action cell (last one usually, but check for button)

            cells.forEach(td => {
                if (td.querySelector('button')) return; // Skip action cell

                const input = td.querySelector('input');
                if (!input) return;

                const val = input.value;
                const colspan = parseInt(td.getAttribute('colspan')) || 1;

                for (let k = 0; k < colspan; k++) {
                    rowData.push(val);
                }

                if (val !== '') hasData = true;
            });

            if (hasData) data.push(rowData);
        });

        if (data.length === 0) {
            alert('Please enter data.');
            return;
        }

        // Send Request
        analyzeBtn.textContent = 'Processing...';
        analyzeBtn.disabled = true;

        try {
            const response = await fetch('/plot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

                    // Hide any previous slope info
                    const slopeInfo = document.getElementById('slope-info');
                    if (slopeInfo) slopeInfo.remove();

                    // Ensure intersection part is visible
                    document.getElementById('intersection-info').style.display = 'block';

                } else {
                    // Show slopes instead
                    statsContainer.style.display = 'block';
                    document.getElementById('intersection-info').style.display = 'none';

                    let slopeInfo = document.getElementById('slope-info');
                    if (!slopeInfo) {
                        slopeInfo = document.createElement('div');
                        slopeInfo.id = 'slope-info';
                        statsContainer.appendChild(slopeInfo);
                    }

                    slopeInfo.innerHTML = '<h3>Slopes</h3>';
                    result.series.forEach(s => {
                        const row = document.createElement('div');
                        row.className = 'stat-row';
                        row.innerHTML = `
                            <span class="stat-label">${s.name}:</span>
                            <span class="stat-value">${s.slope}</span>
                        `;
                        slopeInfo.appendChild(row);
                    });
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

        // Apply dimensions to container
        const w = parseInt(graphWidth.value) || 800;
        const h = parseInt(graphHeight.value) || 500;
        const container = document.getElementById('plot-container');
        container.style.width = w + 'px';
        container.style.height = h + 'px';

        plotDiv.style.width = '100%';
        plotDiv.style.height = '100%';

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
                marker: { size: 12, color: 'black', symbol: 'circle-open', line: { width: 2 } },
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
        plotElement.on('plotly_click', function (data) {
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

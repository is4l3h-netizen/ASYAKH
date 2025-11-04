import React from 'react';

interface WaitTimeChartProps {
    data: { label: string; value: number }[];
    title: string;
    unit: string;
}

const WaitTimeChart: React.FC<WaitTimeChartProps> = ({ data, title, unit }) => {
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-10">
                <p className="text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">لا توجد بيانات متاحة للعرض في الفترة المحددة.</p>
            </div>
        );
    }
    
    const maxValue = Math.max(...data.map(d => d.value), 30); // Ensure a minimum height for the y-axis

    return (
        <div>
            <h3 className="text-center font-semibold text-gray-600 dark:text-gray-300 mb-4">{title}</h3>
            <div className="chart-container w-full h-64 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex gap-2 justify-around items-end">
                <style>{`
                    .chart-bar-wrapper {
                        position: relative;
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: flex-end;
                        align-items: center;
                        text-align: center;
                    }
                    .chart-bar {
                        width: 70%;
                        max-width: 30px;
                        background-color: #d8b4fe;
                        border-radius: 5px 5px 0 0;
                        transition: background-color 0.2s;
                    }
                    .dark .chart-bar {
                        background-color: #a855f7;
                    }
                    .chart-bar:hover {
                        background-color: #c026d3;
                    }
                    .chart-label {
                        font-size: 0.7rem;
                        color: #6b7280;
                        margin-top: 4px;
                        font-weight: 500;
                    }
                    .dark .chart-label {
                        color: #9ca3af;
                    }
                    .tooltip {
                        visibility: hidden;
                        opacity: 0;
                        background-color: #1f2937;
                        color: #fff;
                        text-align: center;
                        border-radius: 6px;
                        padding: 5px 8px;
                        position: absolute;
                        z-index: 1;
                        bottom: 105%;
                        left: 50%;
                        transform: translateX(-50%);
                        transition: opacity 0.2s;
                        font-size: 0.8rem;
                        white-space: nowrap;
                    }
                    .chart-bar-wrapper:hover .tooltip {
                        visibility: visible;
                        opacity: 1;
                    }
                `}</style>
                {data.map((item, index) => (
                    <div key={index} className="chart-bar-wrapper">
                         {item.value > 0 && (
                            <div className="tooltip">
                                {item.value} {unit}
                            </div>
                         )}
                        <div
                            className="chart-bar"
                            style={{ height: `${(item.value / maxValue) * 100}%` }}
                            title={`${item.label}: ${item.value} ${unit}`}
                        ></div>
                        <span className="chart-label">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WaitTimeChart;

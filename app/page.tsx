'use client';

import { useEffect, useState, useRef } from 'react';
import { TextField } from '@mui/material';
import * as d3 from 'd3';

interface ParkingEntry {
  id: string;
  timestamp: string;
  url: string;
  lot_name: string;
  is_full: boolean;
}

interface HeatmapData {
  day: number;
  hour: number;
  value: number;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export default function Home() {
  const [parkingData, setParkingData] = useState<ParkingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeksLimit, setWeeksLimit] = useState<number | undefined>();
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/parking-data');
        const data = await response.json();
        console.log('Data parsed:', data);
        setParkingData(data);
      } catch (error) {
        console.error('Error fetching parking data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const processData = (data: ParkingEntry[]): { [url: string]: HeatmapData[] } => {
    const urlGroups: { [url: string]: ParkingEntry[] } = {};

    // Group entries by URL
    data.forEach(entry => {
      if (!urlGroups[entry.url]) {
        urlGroups[entry.url] = [];
      }
      urlGroups[entry.url].push(entry);
    });

    const heatmapData: { [url: string]: HeatmapData[] } = {};
    const now = new Date('2024-12-27T17:37:24+02:00');
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;

    Object.entries(urlGroups).forEach(([url, entries]) => {
      // Sort entries by timestamp
      entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Initialize counts matrix [day][hour]
      const counts: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
      const totals: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));

      // Filter entries if weeksLimit is set
      const filteredEntries = weeksLimit 
        ? entries.filter(entry => {
            const entryTime = new Date(entry.timestamp).getTime();
            return now.getTime() - entryTime <= weeksLimit * msPerWeek;
          })
        : entries;

      // Process entries
      filteredEntries.forEach(entry => {
        const date = new Date(entry.timestamp);
        const day = date.getDay();
        const hour = date.getHours();
        
        counts[day][hour] += entry.is_full ? 1 : 0;
        totals[day][hour] += 1;
      });

      // Convert to D3 heatmap data format
      const data: HeatmapData[] = [];
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const value = totals[day][hour] > 0 
            ? counts[day][hour] / totals[day][hour]
            : 0;
          
          data.push({ day, hour, value });
        }
      }

      heatmapData[url] = data;
    });

    return heatmapData;
  };

  useEffect(() => {
    if (!parkingData.length || !svgRef.current) return;

    const data = processData(parkingData);
    const firstLotData = Object.values(data)[0];
    if (!firstLotData) return;

    const margin = { top: 30, right: 30, bottom: 50, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear existing SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleBand()
      .range([0, width])
      .domain(d3.range(24).map(d => d.toString()))
      .padding(0.05);

    const y = d3.scaleBand()
      .range([0, height])
      .domain(DAYS_OF_WEEK)
      .padding(0.05);

    const color = d3.scaleSequential()
      .interpolator(d3.interpolateReds)
      .domain([0, 1]);

    // Add X axis
    svg.append('g')
      .style('font-size', '12px')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => `${d}:00`));

    // Add Y axis
    svg.append('g')
      .style('font-size', '12px')
      .call(d3.axisLeft(y));

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .text('Parking Lot Occupancy Heatmap');

    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background-color', 'white')
      .style('border', 'solid')
      .style('border-width', '1px')
      .style('border-radius', '5px')
      .style('padding', '10px');

    // Add the squares
    svg.selectAll()
      .data(firstLotData)
      .enter()
      .append('rect')
      .attr('x', d => x(d.hour.toString()) || 0)
      .attr('y', d => y(DAYS_OF_WEEK[d.day]) || 0)
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .style('fill', d => color(d.value))
      .on('mouseover', (event, d) => {
        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        tooltip.html(`Time: ${d.hour}:00<br/>Day: ${DAYS_OF_WEEK[d.day]}<br/>Occupancy: ${(d.value * 100).toFixed(1)}%`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', () => {
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

  }, [parkingData, weeksLimit]);

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <TextField
          label="Weeks of History"
          type="number"
          value={weeksLimit || ''}
          onChange={(e) => setWeeksLimit(e.target.value ? parseInt(e.target.value) : undefined)}
          size="small"
        />
        {loading ? (
          <p>Loading...</p>
        ) : (
          <svg ref={svgRef}></svg>
        )}
      </div>
    </main>
  );
}

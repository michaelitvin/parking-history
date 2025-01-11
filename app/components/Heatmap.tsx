'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { toZonedTime } from 'date-fns-tz';

export interface HeatmapData {
  day: number;
  hour: number;
  value: number;
  count: number;  // Number of times the lot was full
  total: number;  // Total number of observations
}

interface HeatmapProps {
  data: HeatmapData[];
  title: string;
  link: string | null;
  last_updated: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const interpolateColor = (t: number): string => {
  const r = Math.round(t * 128 + 127);
  const g = Math.round((1 - t) * 128 + 127);
  const b = Math.round(Math.abs(t - 0.5) * 128 + 127);
  return `rgb(${r}, ${g}, ${b})`;
}

const svgWidth = 800;
const svgHeight = 300;

export default function Heatmap({ data, title, link, last_updated }: HeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const margin = { top: 50, right: 30, bottom: 50, left: 50 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    // Clear existing SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
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
      .interpolator(interpolateColor)
      .domain([0, 1]);

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -30)
      .attr('text-anchor', 'middle')
      .attr('class', 'heatmap-title')
      .html(link ? `<a href="${link}" target="_blank">${title}</a>` : title);

    // Add last updated text
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('class', 'heatmap-last-updated')
      .text('Last updated: ' + toZonedTime(last_updated, "Asia/Jerusalem").toLocaleString());

    // Add X axis
    svg.append('g')
      .attr('class', 'heatmap-axis heatmap-axis-x')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => `${d}:00`));

    // Add Y axis
    svg.append('g')
      .attr('class', 'heatmap-axis heatmap-axis-y')
      .call(d3.axisLeft(y));

    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'heatmap-tooltip')
      .style('opacity', 0);

    // Add the squares
    svg.selectAll()
      .data(data)
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
        tooltip.html(`
          Day: ${DAYS_OF_WEEK[d.day]}<br/>
          Time: ${d.hour}:00-${d.hour + 1}:00<br/>
          Occupancy: ${(d.value * 100).toFixed(0)}%<br/>
          Full Count: ${d.count} / ${d.total}
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', () => {
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    return () => {
      // Clean up tooltip when component unmounts
      d3.selectAll('.tooltip').remove();
    };
  }, [data, title, link, last_updated]);

  return <svg ref={svgRef} viewBox={`0 0 ${svgWidth} ${svgHeight}`}></svg>;
}

# Data Visualization Framework for Eswatini Research

## Overview
This document provides a comprehensive framework for creating data-driven visualizations to enhance the Eswatini research project with charts, graphs, and interactive dashboards.

## Visualization Categories

### 1. Economic Indicators Dashboard

#### GDP and Growth Trends
```python
# GDP Growth Comparison Chart
import matplotlib.pyplot as plt
import pandas as pd

# Data for visualization
years = [2020, 2021, 2022, 2023, 2024]
eswatini_gdp = [0.5, 3.2, 2.8, 4.8, 4.9]
regional_avg = [1.2, 2.8, 3.1, 3.8, 3.9]

plt.figure(figsize=(12, 6))
plt.plot(years, eswatini_gdp, marker='o', linewidth=3, label='Eswatini')
plt.plot(years, regional_avg, marker='s', linewidth=3, label='Regional Average')
plt.title('GDP Growth Rate Comparison: Eswatini vs Regional Average', fontsize=16)
plt.xlabel('Year', fontsize=12)
plt.ylabel('GDP Growth Rate (%)', fontsize=12)
plt.legend(fontsize=12)
plt.grid(True, alpha=0.3)
plt.show()
```

#### Economic Structure Pie Chart
```python
# Economic Sector Composition
sectors = ['Services', 'Industry', 'Agriculture']
percentages = [53.5, 33.0, 8.1]
colors = ['#FF6B6B', '#4ECDC4', '#45B7D1']

plt.figure(figsize=(10, 8))
plt.pie(percentages, labels=sectors, autopct='%1.1f%%', colors=colors, startangle=90)
plt.title('Eswatini GDP Composition by Sector (2024)', fontsize=16)
plt.axis('equal')
plt.show()
```

### 2. Social Development Indicators

#### Health Outcomes Comparison
```python
# Life Expectancy Comparison
countries = ['Eswatini', 'South Africa', 'Botswana', 'Namibia', 'Lesotho']
life_expectancy = [59.0, 64.2, 69.3, 63.4, 54.3]

plt.figure(figsize=(12, 6))
bars = plt.bar(countries, life_expectancy, color=['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'])
plt.title('Life Expectancy Comparison: Eswatini vs Regional Peers', fontsize=16)
plt.ylabel('Life Expectancy (Years)', fontsize=12)
plt.xticks(rotation=45)
plt.grid(True, alpha=0.3)

# Add value labels on bars
for bar in bars:
    height = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2., height + 0.5,
             f'{height:.1f}', ha='center', va='bottom', fontsize=10)
plt.show()
```

#### HIV Prevalence Trend
```python
# HIV Prevalence Trend
years = [2020, 2021, 2022, 2023, 2024]
hiv_prevalence = [27.2, 26.8, 26.4, 26.0, 25.6]

plt.figure(figsize=(12, 6))
plt.plot(years, hiv_prevalence, marker='o', linewidth=3, markersize=8, color='#E74C3C')
plt.title('HIV Prevalence Trend in Eswatini (15-49 years)', fontsize=16)
plt.xlabel('Year', fontsize=12)
plt.ylabel('HIV Prevalence (%)', fontsize=12)
plt.grid(True, alpha=0.3)
plt.ylim(20, 30)

# Add trend line
z = np.polyfit(years, hiv_prevalence, 1)
p = np.poly1d(z)
plt.plot(years, p(years), "r--", alpha=0.8, label=f'Trend: {z[0]:.2f}% per year')
plt.legend()
plt.show()
```

### 3. Regional Comparative Analysis

#### Economic Performance Radar Chart
```python
# Radar Chart for Economic Performance
import numpy as np

categories = ['GDP Growth', 'GDP per Capita', 'Inflation Control', 'Unemployment', 'Fiscal Health']
eswatini_scores = [4.9, 4.089, 4.0, 35.4, 41.0]  # Normalized scores
regional_avg = [3.8, 3.245, 5.2, 27.8, 55.2]

# Normalize scores (0-100 scale)
eswatini_normalized = [4.9*10, 4.089*1000, 100-4.0*10, 100-35.4, 100-41.0]
regional_normalized = [3.8*10, 3.245*1000, 100-5.2*10, 100-27.8, 100-55.2]

angles = np.linspace(0, 2 * np.pi, len(categories), endpoint=False).tolist()
eswatini_normalized += eswatini_normalized[:1]
regional_normalized += regional_normalized[:1]
angles += angles[:1]

fig, ax = plt.subplots(figsize=(10, 10), subplot_kw=dict(projection='polar'))
ax.plot(angles, eswatini_normalized, 'o-', linewidth=2, label='Eswatini', color='#FF6B6B')
ax.fill(angles, eswatini_normalized, alpha=0.25, color='#FF6B6B')
ax.plot(angles, regional_normalized, 'o-', linewidth=2, label='Regional Average', color='#4ECDC4')
ax.fill(angles, regional_normalized, alpha=0.25, color='#4ECDC4')

ax.set_xticks(angles[:-1])
ax.set_xticklabels(categories)
ax.set_ylim(0, 100)
ax.set_title('Economic Performance Comparison: Eswatini vs Regional Average', 
             size=16, pad=20)
ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.0))
plt.show()
```

### 4. Demographic Analysis

#### Population Pyramid
```python
# Population Pyramid
age_groups = ['0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65+']
male_pop = [5.2, 5.8, 6.1, 5.9, 5.2, 4.8, 4.2, 3.8, 3.2, 2.8, 2.4, 1.9, 1.5, 1.8]
female_pop = [5.0, 5.6, 5.9, 5.7, 5.1, 4.7, 4.1, 3.7, 3.1, 2.7, 2.3, 1.8, 1.4, 2.1]

fig, ax = plt.subplots(figsize=(12, 8))
y_pos = np.arange(len(age_groups))

ax.barh(y_pos, male_pop, color='#4ECDC4', label='Male')
ax.barh(y_pos, [-x for x in female_pop], color='#FF6B6B', label='Female')

ax.set_yticks(y_pos)
ax.set_yticklabels(age_groups)
ax.set_xlabel('Population Percentage')
ax.set_title('Eswatini Population Pyramid (2024)', fontsize=16)
ax.legend()
ax.grid(True, alpha=0.3)
plt.show()
```

### 5. Trade and Economic Integration

#### Trade Flow Sankey Diagram
```python
# Trade Flow Visualization
import plotly.graph_objects as go

# Trade flow data
source = [0, 0, 0, 1, 1, 1, 2, 2, 2]
target = [3, 4, 5, 3, 4, 5, 3, 4, 5]
value = [65.2, 12.8, 8.5, 75.1, 3.2, 6.8, 70.2, 8.0, 7.7]

fig = go.Figure(data=[go.Sankey(
    node = dict(
      pad = 15,
      thickness = 20,
      line = dict(color = "black", width = 0.5),
      label = ["Eswatini Exports", "Eswatini Imports", "Total Trade", "South Africa", "United States", "European Union"],
      color = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"]
    ),
    link = dict(
      source = source,
      target = target,
      value = value
  ))])

fig.update_layout(title_text="Eswatini Trade Flow Analysis (2024)", font_size=16)
fig.show()
```

### 6. Development Progress Tracking

#### Human Development Index Trend
```python
# HDI Trend Analysis
years = [2020, 2021, 2022, 2023, 2024]
hdi_eswatini = [0.608, 0.612, 0.616, 0.620, 0.624]
hdi_regional = [0.645, 0.648, 0.651, 0.654, 0.657]

plt.figure(figsize=(12, 6))
plt.plot(years, hdi_eswatini, marker='o', linewidth=3, label='Eswatini', color='#FF6B6B')
plt.plot(years, hdi_regional, marker='s', linewidth=3, label='Regional Average', color='#4ECDC4')
plt.title('Human Development Index Trend: Eswatini vs Regional Average', fontsize=16)
plt.xlabel('Year', fontsize=12)
plt.ylabel('HDI Score', fontsize=12)
plt.legend(fontsize=12)
plt.grid(True, alpha=0.3)
plt.ylim(0.5, 0.7)
plt.show()
```

## Interactive Dashboard Framework

### Streamlit Dashboard
```python
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

st.set_page_config(page_title="Eswatini Research Dashboard", layout="wide")

# Sidebar
st.sidebar.title("Eswatini Research Dashboard")
selected_category = st.sidebar.selectbox("Select Category", 
                                       ["Economic", "Social", "Health", "Education", "Regional Comparison"])

# Main content
st.title("Eswatini: Data-Driven Research Analysis")

if selected_category == "Economic":
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("GDP Growth Trend")
        # GDP growth chart
        fig = px.line(x=years, y=eswatini_gdp, title="GDP Growth Rate")
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.subheader("Economic Structure")
        # Economic structure pie chart
        fig = px.pie(values=percentages, names=sectors, title="GDP Composition")
        st.plotly_chart(fig, use_container_width=True)

elif selected_category == "Health":
    st.subheader("Health Indicators")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.metric("Life Expectancy", "59.0 years", "0.3")
        st.metric("HIV Prevalence", "25.6%", "-0.4%")
    
    with col2:
        st.metric("Infant Mortality", "39.7 per 1,000", "-0.7")
        st.metric("Maternal Mortality", "373 per 100,000", "-4")
```

## Data Visualization Best Practices

### Color Schemes
```python
# Eswatini-themed color palette
eswatini_colors = {
    'primary': '#FF6B6B',      # Red (from flag)
    'secondary': '#4ECDC4',    # Teal
    'accent': '#45B7D1',       # Blue
    'success': '#96CEB4',      # Green
    'warning': '#FFEAA7',      # Yellow
    'info': '#DDA0DD',         # Purple
    'neutral': '#95A5A6'       # Gray
}
```

### Chart Templates
```python
# Standard chart template
def create_chart_template():
    plt.style.use('seaborn-v0_8')
    plt.rcParams['figure.figsize'] = (12, 6)
    plt.rcParams['font.size'] = 12
    plt.rcParams['axes.titlesize'] = 16
    plt.rcParams['axes.labelsize'] = 12
    plt.rcParams['xtick.labelsize'] = 10
    plt.rcParams['ytick.labelsize'] = 10
    plt.rcParams['legend.fontsize'] = 12
```

## Data Sources for Visualization

### Primary Data Sources
1. **World Bank World Development Indicators**
2. **IMF World Economic Outlook**
3. **UN Population Division**
4. **WHO Global Health Observatory**
5. **UNESCO Institute for Statistics**
6. **Central Bank of Eswatini**
7. **Central Statistical Office Eswatini**

### Data Update Schedule
- **Monthly**: Economic indicators, inflation, unemployment
- **Quarterly**: GDP growth, trade data, fiscal indicators
- **Annually**: Social indicators, health outcomes, education statistics
- **Biennially**: Poverty surveys, demographic data

## Implementation Guidelines

### Technical Requirements
- **Python**: pandas, matplotlib, plotly, seaborn
- **R**: ggplot2, plotly, shiny
- **JavaScript**: D3.js, Chart.js, Highcharts
- **Web**: Streamlit, Dash, Shiny

### Data Quality Standards
- **Accuracy**: Verify data from multiple sources
- **Timeliness**: Use most recent available data
- **Consistency**: Ensure consistent methodology
- **Completeness**: Fill gaps with estimates where appropriate

### Accessibility Considerations
- **Color Blindness**: Use colorblind-friendly palettes
- **Screen Readers**: Provide alt text for charts
- **Mobile Responsive**: Ensure charts work on mobile devices
- **Download Options**: Provide data download capabilities

## Next Steps

### Immediate Actions
1. **Data Collection**: Gather all required datasets
2. **Data Cleaning**: Clean and standardize data
3. **Chart Creation**: Create initial set of visualizations
4. **Dashboard Development**: Build interactive dashboard
5. **Testing**: Test visualizations and dashboard

### Long-term Development
1. **Real-time Updates**: Implement real-time data updates
2. **Advanced Analytics**: Add predictive analytics
3. **Mobile App**: Develop mobile application
4. **API Integration**: Create API for data access
5. **User Training**: Provide training for users

This framework provides a comprehensive approach to creating data-driven visualizations that will enhance the Eswatini research project with clear, informative, and engaging charts and dashboards.

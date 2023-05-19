import '../scss/styles.scss'
import 'bootstrap-icons/font/bootstrap-icons.css'
import * as bootstrap from 'bootstrap'

import { addChart } from './utilities'

import { additivesBubbleChart } from './charts/additives/bubble_chart'
import { additivesBubbleChartAlt } from './charts/additives/bubble_chart_alt'
import { additivesFoodCategoryBubbleGraph } from './charts/additives/food_category_bubble_chart'
import { novaStackedBarChart } from './charts/additives/nova_stacked_bar_chart'
import { vegetarianVeganAdditivesCountBarChart } from './charts/additives/vegetarian_vegan_count_bar_chart'
import { vegetarianVeganAverageHazardsBarChart } from './charts/additives/vegetarian_vegan_hazard_bar_chart'
import { nutriscoreStackedBarChart } from './charts/additives/nutriscore_stacked_bar_chart'

const CHARTS = {
    '#g-additives-bubble-chart': additivesBubbleChart,
    '#g-additives-bubble-chart-2': additivesBubbleChartAlt,
    '#g-additives-food-category-bubble-chart': additivesFoodCategoryBubbleGraph,
    '#g-nutriscore-stacked-bar-chart': nutriscoreStackedBarChart,
    '#g-vegetarian-vegan-additives-count-bar-chart': vegetarianVeganAdditivesCountBarChart,
    '#g-vegetarian-vegan-average-hazards-bar-chart': vegetarianVeganAverageHazardsBarChart,
    '#g-nova-stacked-bar-chart': novaStackedBarChart
}

window.onload = () => Object.entries(CHARTS).forEach(entry => addChart(...entry))


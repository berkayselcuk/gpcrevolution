// Refactored function to initialize snakeplot tooltips on a given SVG element.
function initSnakeplotTooltips(svg) {
  // Create a tooltip <div> if it doesn't exist yet.
  let tooltip = document.getElementById('snake-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'snake-tooltip';
    tooltip.classList.add('snake-tooltip'); // uses your existing snakeplot.css styling
    document.body.appendChild(tooltip);
  }
  
  // Find all elements with a tooltip attribute.
  let hoverElems = svg.querySelectorAll('[data-original-title], [title]');
  
  hoverElems.forEach(elem => {
    let text = elem.getAttribute('data-original-title') || elem.getAttribute('title') || '';
    
    elem.addEventListener('mouseover', e => {
      let baseText = text.trim();
      // Look for the snake-specific category.
      let cat = elem.getAttribute('data-snake-category');
      if (cat) {
        tooltip.innerHTML = baseText + "<br>Category: " + cat;
      } else {
        tooltip.textContent = baseText;
      }
      tooltip.style.opacity = '1';
    });
    
    elem.addEventListener('mousemove', e => {
      tooltip.style.left = (e.pageX + 12) + 'px';
      tooltip.style.top = (e.pageY + 12) + 'px';
    });
    
    elem.addEventListener('mouseout', e => {
      tooltip.style.opacity = '0';
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  let svg = document.getElementById('snakeplot');
  if (svg) {
    initSnakeplotTooltips(svg);
  }
});

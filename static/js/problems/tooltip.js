
function createTooltip() {
  tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  document.body.appendChild(tooltip);
};

function showTooltip(event) {
  const target = event.currentTarget;
  const tooltipText = target.getAttribute('data-tooltip');
  if (!tooltipText) return;

  if (tooltip) {
    tooltip.textContent = tooltipText;
    tooltip.style.display = 'block';
  }
  updateTooltipPosition(event);
}

function hideTooltip() {
  if (tooltip)
    tooltip.style.display = 'none';
}

function updateTooltipPosition(event) {
  const mouseX = event.clientX;
  const mouseY = event.clientY;
  if (tooltip) {
    tooltip.style.left = (mouseX + 15) + 'px';
    tooltip.style.top = (mouseY + 15) + 'px';
  }
}

document.querySelectorAll('.row').forEach(function(element) {
  element.addEventListener('mousemove', updateTooltipPosition);
});

#!/usr/bin/env python3

from PIL import Image, ImageDraw, ImageFont
import os

# Create a nice video placeholder
width, height = 800, 600
image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)

# Dark gradient background
for y in range(height):
    opacity = int(255 * (1 - y / height * 0.3))
    color = (20, 20, 30, opacity)
    draw.rectangle([(0, y), (width, y + 1)], fill=color)

# Film strip effect on sides
strip_width = 40
hole_size = 20
hole_spacing = 40

# Left strip
draw.rectangle([(0, 0), (strip_width, height)], fill=(10, 10, 20, 255))
for y in range(10, height - 10, hole_spacing):
    draw.rectangle([(10, y), (30, y + hole_size)], fill=(30, 30, 40, 255))

# Right strip  
draw.rectangle([(width - strip_width, 0), (width, height)], fill=(10, 10, 20, 255))
for y in range(10, height - 10, hole_spacing):
    draw.rectangle([(width - 30, y), (width - 10, y + hole_size)], fill=(30, 30, 40, 255))

# Play button circle
center_x, center_y = width // 2, height // 2
circle_radius = 60
draw.ellipse(
    [(center_x - circle_radius, center_y - circle_radius),
     (center_x + circle_radius, center_y + circle_radius)],
    fill=(255, 255, 255, 40),
    outline=(255, 255, 255, 100),
    width=3
)

# Play triangle
triangle_size = 30
triangle = [
    (center_x - triangle_size // 2, center_y - triangle_size),
    (center_x - triangle_size // 2, center_y + triangle_size),
    (center_x + triangle_size, center_y)
]
draw.polygon(triangle, fill=(255, 255, 255, 200))

# Add subtle grid pattern
for x in range(0, width, 50):
    draw.line([(x, 0), (x, height)], fill=(255, 255, 255, 10), width=1)
for y in range(0, height, 50):
    draw.line([(0, y), (width, y)], fill=(255, 255, 255, 10), width=1)

# Save the image
output_path = "public/placeholder-video-enhanced.png"
image.save(output_path, "PNG")
print(f"✅ Enhanced video placeholder created: {output_path}") 
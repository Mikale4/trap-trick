shader_type spatial;
render_mode diffuse_lambert, specular_disabled;
// The ground she walks on: a texture a pixel to each of her voxels (2.4 cm), and the scenery's voxel grain over it.
uniform sampler2D tex : source_color, filter_nearest_mipmap_anisotropic, repeat_disable;
uniform float cell = 0.024;
uniform float amount = 0.06;
varying vec2 p;

void vertex() {
	p = VERTEX.xz / cell;
}

void fragment() {
	vec2 w = fwidth(p);
	float far = clamp(1.7 - max(w.x, w.y), 0.0, 1.0);
	float j = 0.0;
	if (far > 0.0) {
		uvec2 q = uvec2(ivec2(floor(p)) + 8192);
		uint h = q.x * 374761393u + q.y * 668265263u;
		h = (h ^ (h >> 13u)) * 1274126177u;
		h = h ^ (h >> 16u);
		j = (float(h & 65535u) / 65535.0 - 0.5) * 2.0 * amount * far;
	}
	ALBEDO = texture(tex, UV).rgb * (1.0 + j);
	ROUGHNESS = 1.0;
}

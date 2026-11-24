shader_type spatial;
render_mode diffuse_lambert, specular_disabled;
// The scenery's voxel grain: every 2.4 cm cell (her voxel) gets its own slight shade, as each of her own voxels has, so a
// wall whose faces were merged into a few big quads still reads as made of the same voxels as she is. It fades out where
// a cell gets smaller than a pixel. Colours are the baked vertex colours (sRGB).
uniform float cell = 0.024;
uniform float amount = 0.055;
varying vec3 p;
varying flat vec3 n;

void vertex() {
	// (the alpha says which axes of this mesh sit half a cell off the lattice, as a jointed part's may)
	int half = int(round((1.0 - COLOR.a) * 255.0));
	p = VERTEX / cell + 0.5 * vec3(float(half & 1), float((half >> 1) & 1), float((half >> 2) & 1));
	n = NORMAL;
	COLOR.rgb = mix(pow((COLOR.rgb + vec3(0.055)) / 1.055, vec3(2.4)), COLOR.rgb / 12.92, lessThan(COLOR.rgb, vec3(0.04045)));
}

void fragment() {
	vec3 w = fwidth(p);
	float far = clamp(1.7 - max(w.x, max(w.y, w.z)), 0.0, 1.0);
	float j = 0.0;
	if (far > 0.0) {
		uvec3 q = uvec3(ivec3(floor(p - n * 0.5)) + 4096);
		uint h = q.x * 374761393u + q.y * 668265263u + q.z * 2147483647u;
		h = (h ^ (h >> 13u)) * 1274126177u;
		h = h ^ (h >> 16u);
		j = (float(h & 65535u) / 65535.0 - 0.5) * 2.0 * amount * far;
	}
	ALBEDO = COLOR.rgb * (1.0 + j);
	ROUGHNESS = 1.0;
}

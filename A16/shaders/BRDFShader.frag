#version 450#extension GL_ARB_separate_shader_objects : enablelayout(location = 0) in vec3 fragPos;layout(location = 1) in vec3 fragNorm;layout(location = 2) in vec2 fragTexCoord;layout(location = 0) out vec4 outColor;layout(binding = 1) uniform sampler2D texSampler;layout(binding = 2) uniform GlobalUniformBufferObject {	vec3 lightDir0;	vec3 lightColor0;	vec3 lightDir1;	vec3 lightColor1;	vec3 lightDir2;	vec3 lightColor2;	vec3 lightDir3;	vec3 lightColor3;	vec3 eyePos;	vec4 selector;} gubo;/**** Modify from here *****/vec3 Lambert_Diffuse_BRDF(vec3 L, vec3 N, vec3 V, vec3 C) {	// Lambert Diffuse BRDF model	// in all BRDF parameters are:	// vec3 L : light direction	// vec3 N : normal vector	// vec3 V : view direction	// vec3 C : main color (diffuse color, or specular color)	return C * clamp(dot(L, N), 0.0f, 1.0f);	//return gubo.lightColor0 * C * clamp(dot(L, N), 0, 1);	//return gubo.lightColor0 * dot(C, clamp(dot(gubo.lightDir0, N), 0, 1));	//return gubo.lightColor0 * clamp(dot(gubo.lightDir0, N), 0.0f, 1.0f);	/*float value0 = gubo.lightColor0[0] * dot(C[0], clamp(dot(gubo.lightDir0, N), 0, 1));	float value1 = gubo.lightColor0[1] * dot(C[1], clamp(dot(gubo.lightDir0, N), 0, 1));	float value2 = gubo.lightColor0[2] * dot(C[2], clamp(dot(gubo.lightDir0, N), 0, 1));	return vec3(value0, value1, value2);*/}vec3 Oren_Nayar_Diffuse_BRDF(vec3 L, vec3 N, vec3 V, vec3 C, float sigma) {	// Directional light direction	// additional parameter:	// float sigma : roughness of the material	float tetai = acos(dot(L, N));	float tetar = acos(dot(V, N));	float alpha = max(tetai, tetar);	float beta = min(tetai, tetar);	float a = 1 - (0.5 * ((pow(sigma, 2)) / (pow(sigma, 2) + 0.33)));	float b = (0.45 * ((pow(sigma, 2)) / (pow(sigma, 2) + 0.09)));	vec3 vi = normalize(L - (dot(L, N) * N));	vec3 vr = normalize(V - (dot(V, N) * N));	float g = max(0, dot(vi, vr));				/*float elementL0 = dot(C[0], clamp(dot(L, N), 0, 1));	float elementL1 = dot(C[1], clamp(dot(L, N), 0, 1));	float elementL2 = dot(C[2], clamp(dot(L, N), 0, 1));	vec3 elementL = vec3(elementL0, elementL1, elementL2);*/				vec3 elementL = C * clamp(dot(L, N), 0.0f, 1.0f);	return elementL * (a + b * g * sin(alpha) * tan(beta));}vec3 retrievePhongForOneLight(vec3 L, vec3 N, vec3 V, vec3 C, float gamma) {	vec3 r = -reflect(L, N);	//vec3 r = (2 * N * (dot(L, N))) - L;		return C * pow(clamp(dot(r,V), 0.0f, 1.0f), gamma);}vec3 Phong_Specular_BRDF(vec3 L, vec3 N, vec3 V, vec3 C, float gamma) {	// Phong Specular BRDF model	// additional parameter:	// float gamma : exponent of the cosine term	return retrievePhongForOneLight(L, N, V, C, gamma);	/*vec3 light0 = retrievePhongForOneLight(gubo.lightDir0, N, V, gubo.lightColor0, gamma);	vec3 light1 = retrievePhongForOneLight(gubo.lightDir1, N, V, gubo.lightColor1, gamma);	vec3 light2 = retrievePhongForOneLight(gubo.lightDir2, N, V, gubo.lightColor2, gamma);	vec3 light3 = retrievePhongForOneLight(gubo.lightDir3, N, V, gubo.lightColor3, gamma);	return (light0 + light1 + light2 + light3) * C;*/		/*vec3 light0 = retrievePhongForOneLight(gubo.lightDir0, N, V, C, gamma);	vec3 light1 = retrievePhongForOneLight(gubo.lightDir1, N, V, C, gamma);	vec3 light2 = retrievePhongForOneLight(gubo.lightDir2, N, V, C, gamma);	vec3 light3 = retrievePhongForOneLight(gubo.lightDir3, N, V, C, gamma);	return (gubo.lightColor0 * light0) + (gubo.lightColor1 * light1) + (gubo.lightColor2 * light2) + (gubo.lightColor3 * light3);*/}vec3 Toon_Diffuse_BRDF(vec3 L, vec3 N, vec3 V, vec3 C, vec3 Cd, float thr) {	// Toon Diffuse Brdf	// additional parameters:	// vec3 Cd : color to be used in dark areas	// float thr : color threshold		float thr2 = thr/10;	float val2 = dot(L, N);	if (val2 >= thr) {		return C;	} else if (val2 < thr && val2 >= thr2) {		return Cd;	} else {		return 0.01f * C;	}				/*float val = dot(L, N);	if (val >= thr) {		return C;// * val;	} else {		return Cd;// * val;	}*/}vec3 Toon_Specular_BRDF(vec3 L, vec3 N, vec3 V, vec3 C, float thr)  {	// Directional light direction	// additional parameter:	// float thr : color threshold	vec3 r = 2 * N * dot(L, N) - L;	float val = dot(V, r);	if (val >= thr) {		return C;// * val;	} else {		return vec3(0, 0, 0);// * val;	}}/**** To here *****/vec3 BRDF_D(vec3 L, vec3 N, vec3 V, vec3 C) {	return gubo.selector.x * Lambert_Diffuse_BRDF(L, N, V, C) +		   (1.0 - gubo.selector.x) * (1.0 - gubo.selector.y) * 		   			Toon_Diffuse_BRDF(L, N, V, C, 0.2f * C, 0.5) +		   (1.0 - gubo.selector.x) * (gubo.selector.y) * 		   			Oren_Nayar_Diffuse_BRDF(L, N, V, C, 1.5);}vec3 BRDF_S(vec3 L, vec3 N, vec3 V, vec3 C) {	return Phong_Specular_BRDF(L, N, V, C, 200.0f) * gubo.selector.z +		   (1.0 - gubo.selector.x) * (1.0 - gubo.selector.y) * 		   			Toon_Specular_BRDF(L, N, V, vec3(1,1,1), 0.97f);}void main() {	vec3 Norm = normalize(fragNorm);	vec3 EyeDir = normalize(gubo.eyePos.xyz - fragPos);		float AmbFact = 0.025;		vec3 DiffColor = texture(texSampler, fragTexCoord).rgb * gubo.selector.w + vec3(1,1,1) * (1-gubo.selector.w);	vec3 Diffuse = vec3(0,0,0);		Diffuse += BRDF_D(gubo.lightDir0, Norm, EyeDir, DiffColor) * gubo.lightColor0;	Diffuse += BRDF_D(gubo.lightDir1, Norm, EyeDir, DiffColor) * gubo.lightColor1;	Diffuse += BRDF_D(gubo.lightDir2, Norm, EyeDir, DiffColor) * gubo.lightColor2;	Diffuse += BRDF_D(gubo.lightDir3, Norm, EyeDir, DiffColor) * gubo.lightColor3;		vec3 Specular = vec3(0,0,0);	Specular += BRDF_S(gubo.lightDir0, Norm, EyeDir, vec3(1,1,1)) * gubo.lightColor0;	Specular += BRDF_S(gubo.lightDir1, Norm, EyeDir, vec3(1,1,1)) * gubo.lightColor1;	Specular += BRDF_S(gubo.lightDir2, Norm, EyeDir, vec3(1,1,1)) * gubo.lightColor2;	Specular += BRDF_S(gubo.lightDir3, Norm, EyeDir, vec3(1,1,1)) * gubo.lightColor3;	vec3 Ambient = AmbFact * DiffColor;		outColor = vec4(Diffuse + Specular + Ambient, 1.0f);	}
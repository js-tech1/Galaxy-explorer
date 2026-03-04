THREE.OrbitControls = function(object, domElement) {
                                var self = this;
                                self.object = object;
                                self.domElement = domElement;
                                self.enabled = true;
                                self.target = new THREE.Vector3();
                                self.minDistance = 0;
                                self.maxDistance = Infinity;
                                self.minPolarAngle = 0.1;           // prevent going over north pole
                                self.maxPolarAngle = Math.PI - 0.1; // prevent going over south pole
                                self.enableZoom = true;
                                self.zoomSpeed = 1.0;
                                self.enableRotate = true;
                                self.rotateSpeed = 1.0;
                                self.enablePan = true;
                                self.panSpeed = 1.0;
                                self.enableDamping = false;
                                self.dampingFactor = 0.05;
                                self.autoRotate = false;
                                self.autoRotateSpeed = 2.0;
                                
                                // Internal state
                                var theta = 0, phi = Math.PI / 2, radius = 10;
                                var thetaDelta = 0, phiDelta = 0, scaleDelta = 1;
                                var panX = 0, panY = 0, panZ = 0;
                                var EPS = 0.000001;
                                
                                // Derive initial spherical from camera position
                                function syncFromCamera() {
                                    var dx = object.position.x - self.target.x;
                                    var dy = object.position.y - self.target.y;
                                    var dz = object.position.z - self.target.z;
                                    radius = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
                                    theta  = Math.atan2(dx, dz);
                                    phi    = Math.acos(Math.max(-1, Math.min(1, dy / radius)));
                                    thetaDelta = 0; phiDelta = 0; scaleDelta = 1;
                                    panX = 0; panY = 0; panZ = 0;
                                }
                                syncFromCamera();
                                
                                self.reset = syncFromCamera;
                                
                                self.update = function() {
                                    if (self.autoRotate) thetaDelta -= 2 * Math.PI / 60 / 60 * self.autoRotateSpeed;
                                
                                    theta += thetaDelta;
                                    phi += phiDelta;
                                    phi = Math.max(self.minPolarAngle + EPS, Math.min(self.maxPolarAngle - EPS, phi));
                                
                                    radius *= scaleDelta;
                                    radius = Math.max(self.minDistance, Math.min(self.maxDistance, radius));
                                
                                    self.target.x += panX;
                                    self.target.y += panY;
                                    self.target.z += panZ;
                                
                                    var sinPhi = Math.sin(phi);
                                    object.position.x = self.target.x + radius * sinPhi * Math.sin(theta);
                                    object.position.y = self.target.y + radius * Math.cos(phi);
                                    object.position.z = self.target.z + radius * sinPhi * Math.cos(theta);
                                    object.lookAt(self.target);
                                
                                    thetaDelta = 0; phiDelta = 0; scaleDelta = 1;
                                    panX = 0; panY = 0; panZ = 0;
                                };
                                
                                // Input tracking
                                var NONE = -1, ROTATE = 0, DOLLY = 1, PAN = 2;
                                var state = NONE;
                                var rotStart = new THREE.Vector2();
                                var dollyStart = new THREE.Vector2();
                                var panStart = new THREE.Vector2();
                                
                                function getZoomScale() { return Math.pow(0.95, self.zoomSpeed); } // always < 1
                                
                                function zoomIn()  { scaleDelta *= getZoomScale(); }   // multiply by <1 = shrink radius
                                function zoomOut() { scaleDelta /= getZoomScale(); }   // divide by <1 = grow radius
                                
                                function doPan(dx, dy) {
                                    var dist = object.position.distanceTo(self.target);
                                    var fov  = object.fov !== undefined ? object.fov : 60;
                                    var factor = dist * Math.tan(fov / 2 * Math.PI / 180) * 2 / domElement.clientHeight * self.panSpeed;
                                    // right vector from camera matrix column 0
                                    panX -= dx * factor * (object.matrix.elements[0]);
                                    panY -= dx * factor * (object.matrix.elements[1]);
                                    panZ -= dx * factor * (object.matrix.elements[2]);
                                    // up vector from camera matrix column 1
                                    panX += dy * factor * (object.matrix.elements[4]);
                                    panY += dy * factor * (object.matrix.elements[5]);
                                    panZ += dy * factor * (object.matrix.elements[6]);
                                }
                                
                                // Mouse
                                function onMouseDown(e) {
                                    if (!self.enabled) return;
                                    if (e.button === 0) { state = ROTATE; rotStart.set(e.clientX, e.clientY); }
                                    else if (e.button === 1) { state = DOLLY; dollyStart.set(e.clientX, e.clientY); }
                                    else if (e.button === 2) { state = PAN;  panStart.set(e.clientX, e.clientY); }
                                    document.addEventListener('mousemove', onMouseMove);
                                    document.addEventListener('mouseup', onMouseUp);
                                }
                                function onMouseMove(e) {
                                    if (!self.enabled) return;
                                    if (state === ROTATE) {
                                    var dx = e.clientX - rotStart.x;
                                    var dy = e.clientY - rotStart.y;
                                    thetaDelta -= 2 * Math.PI * dx / domElement.clientHeight * self.rotateSpeed;
                                    phiDelta   -= 2 * Math.PI * dy / domElement.clientHeight * self.rotateSpeed;
                                    rotStart.set(e.clientX, e.clientY);
                                    self.update();
                                    } else if (state === DOLLY) {
                                    var dy = e.clientY - dollyStart.y;
                                    if (dy > 0) zoomOut();
                                    else if (dy < 0) zoomIn();
                                    dollyStart.set(e.clientX, e.clientY);
                                    self.update();
                                    } else if (state === PAN) {
                                    doPan(e.clientX - panStart.x, e.clientY - panStart.y);
                                    panStart.set(e.clientX, e.clientY);
                                    self.update();
                                    }
                                }
                                function onMouseUp() {
                                    state = NONE;
                                    document.removeEventListener('mousemove', onMouseMove);
                                    document.removeEventListener('mouseup', onMouseUp);
                                }
                                function onWheel(e) {
                                    if (!self.enabled || !self.enableZoom) return;
                                    e.preventDefault();
                                    if (e.deltaY < 0) zoomIn();
                                    else zoomOut();
                                    self.update();
                                }
                                function onContextMenu(e) { if (self.enabled) e.preventDefault(); }
                                
                                // Touch
                                var touches = [];
                                var lastTouchDist = 0;
                                var lastTouchMid = new THREE.Vector2();
                                
                                function onTouchStart(e) {
                                    e.preventDefault();
                                    touches = Array.from(e.touches);
                                    if (touches.length === 1) {
                                    state = ROTATE;
                                    rotStart.set(touches[0].clientX, touches[0].clientY);
                                    } else if (touches.length === 2) {
                                    state = DOLLY;
                                    var dx = touches[0].clientX - touches[1].clientX;
                                    var dy = touches[0].clientY - touches[1].clientY;
                                    lastTouchDist = Math.sqrt(dx*dx + dy*dy);
                                    lastTouchMid.set((touches[0].clientX+touches[1].clientX)/2,
                                                    (touches[0].clientY+touches[1].clientY)/2);
                                    }
                                }
                                function onTouchMove(e) {
                                    e.preventDefault();
                                    var t = Array.from(e.touches);
                                    var spd = (typeof currentState !== 'undefined' && currentState === 'surface') ? self.rotateSpeed * 0.4 : self.rotateSpeed;
                                    if (t.length === 1 && state === ROTATE) {
                                    thetaDelta -= 2*Math.PI*(t[0].clientX - rotStart.x)/domElement.clientHeight * spd;
                                    phiDelta   -= 2*Math.PI*(t[0].clientY - rotStart.y)/domElement.clientHeight * spd;
                                    rotStart.set(t[0].clientX, t[0].clientY);
                                    self.update();
                                    } else if (t.length === 2) {
                                    var dx = t[0].clientX - t[1].clientX;
                                    var dy = t[0].clientY - t[1].clientY;
                                    var dist = Math.sqrt(dx*dx + dy*dy);
                                    if (lastTouchDist > 0) {
                                        // pinch in (dist shrinks) = zoom out, spread (dist grows) = zoom in
                                        if (dist > lastTouchDist) zoomIn();
                                        else if (dist < lastTouchDist) zoomOut();
                                    }
                                    lastTouchDist = dist;
                                    // pan from midpoint change
                                    var mx = (t[0].clientX+t[1].clientX)/2;
                                    var my = (t[0].clientY+t[1].clientY)/2;
                                    doPan(mx - lastTouchMid.x, my - lastTouchMid.y);
                                    lastTouchMid.set(mx, my);
                                    self.update();
                                    }
                                }
                                function onTouchEnd(e) {
                                    touches = Array.from(e.touches);
                                    if (touches.length === 0) state = NONE;
                                    else if (touches.length === 1) {
                                    state = ROTATE;
                                    rotStart.set(touches[0].clientX, touches[0].clientY);
                                    }
                                }
                                
                                domElement.addEventListener('mousedown',   onMouseDown);
                                domElement.addEventListener('wheel',       onWheel, {passive:false});
                                domElement.addEventListener('contextmenu', onContextMenu);
                                domElement.addEventListener('touchstart',  onTouchStart, {passive:false});
                                domElement.addEventListener('touchmove',   onTouchMove,  {passive:false});
                                domElement.addEventListener('touchend',    onTouchEnd);
                                
                                // EventDispatcher
                                var _ed = new THREE.EventDispatcher();
                                self.addEventListener    = function(t,f){ _ed.addEventListener(t,f); };
                                self.removeEventListener = function(t,f){ _ed.removeEventListener(t,f); };
                                self.dispatchEvent       = function(e){ _ed.dispatchEvent(e); };
                                
                                self.dispose = function() {
                                    domElement.removeEventListener('mousedown',   onMouseDown);
                                    domElement.removeEventListener('wheel',       onWheel);
                                    domElement.removeEventListener('contextmenu', onContextMenu);
                                    domElement.removeEventListener('touchstart',  onTouchStart);
                                    domElement.removeEventListener('touchmove',   onTouchMove);
                                    domElement.removeEventListener('touchend',    onTouchEnd);
                                };
                                
                                self.update();
                                };
                                
                                
                                if(typeof THREE==='undefined'){
                                document.getElementById('loading-status').textContent='ERROR: THREE not loaded - check internet';
                                }
                                
                                // ============================================================
                                //  MILKY WAY EXPLORER — PROCEDURAL UNIVERSE ENGINE
                                //  Architecture: GalaxyGenerator → SectorGenerator →
                                //  StarSystemGenerator → PlanetGenerator → TerrainGenerator
                                // ============================================================
                                
                                // ── DETERMINISTIC SEEDED RNG ──────────────────────────────
                                class SeededRNG {
                                constructor(seed) {
                                    this.seed = seed >>> 0;
                                }
                                next() {
                                    this.seed ^= this.seed << 13;
                                    this.seed ^= this.seed >> 17;
                                    this.seed ^= this.seed << 5;
                                    return (this.seed >>> 0) / 4294967296;
                                }
                                range(min, max) { return min + this.next() * (max - min); }
                                int(min, max) { return Math.floor(this.range(min, max + 1)); }
                                pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
                                // Hash multiple values into seed
                                static hash(...vals) {
                                    let h = 2166136261;
                                    for (const v of vals) {
                                    h ^= (v * 16777619) >>> 0;
                                    h = Math.imul(h, 1000003) >>> 0;
                                    }
                                    return h;
                                }
                                }
                                
                                // ── GALAXY CONSTANTS ─────────────────────────────────────
                                const GALAXY = {
                                RADIUS_KLY: 52,
                                THICKNESS_KLY: 1.0,
                                BULGE_RADIUS: 8,
                                NUM_ARMS: 4,
                                ARM_TWIST: 3.5,
                                STARS_VISIBLE: 120000,
                                SECTORS_PER_SIDE: 256,
                                GALAXY_SEED: 0xDEADBEEF,
                                };
                                
                                // ── REAL ASTRONOMICAL UNITS ──────────────────────────────
                                const AU_KM        = 149597870;       // 1 AU in km
                                const LY_KM        = 63241 * AU_KM;  // 1 light-year in km
                                const PC_LY        = 3.2616;         // parsec to light-years
                                // Scene-space: 1 scene unit = 1 kly at galaxy scale, 1 AU at system scale
                                const AU_SCENE     = 10;             // 1 AU = 10 scene units in system view
                                const BASE_ORBITAL_SPEED = 0.05;     // rad/s at 1 AU — scales by Kepler
                                
                                // ── KNOWN STAR CATALOG ────────────────────────────────────
                                // Real stars injected into the procedural galaxy at approximate positions.
                                // Distances in ly from Sol (scene-unit scale: kly).
                                const REAL_STAR_CATALOG = [
                                { name:'Alpha Centauri A', typeKey:'G', dist_ly:4.37,  ra_deg:219.9, dec_deg:-60.8, temp:5790, mass:1.10, luminosity:1.52  },
                                { name:'Sirius A',         typeKey:'A', dist_ly:8.6,   ra_deg:101.3, dec_deg:-16.7, temp:9940, mass:2.06, luminosity:25.4  },
                                { name:'Epsilon Eridani',  typeKey:'K', dist_ly:10.5,  ra_deg:53.2,  dec_deg:-9.5,  temp:5084, mass:0.82, luminosity:0.34  },
                                { name:'Tau Ceti',         typeKey:'G', dist_ly:11.9,  ra_deg:26.0,  dec_deg:-15.9, temp:5344, mass:0.78, luminosity:0.52  },
                                { name:'Vega',             typeKey:'A', dist_ly:25.0,  ra_deg:279.2, dec_deg:38.8,  temp:9602, mass:2.14, luminosity:40.1  },
                                { name:'Arcturus',         typeKey:'K', dist_ly:36.7,  ra_deg:213.9, dec_deg:19.2,  temp:4286, mass:1.08, luminosity:170   },
                                { name:'Fomalhaut',        typeKey:'A', dist_ly:25.1,  ra_deg:344.4, dec_deg:-29.6, temp:8590, mass:1.92, luminosity:16.6  },
                                { name:'Betelgeuse',       typeKey:'O', dist_ly:700,   ra_deg:88.8,  dec_deg:7.4,   temp:3500, mass:18.0, luminosity:1e5   },
                                { name:'Rigel',            typeKey:'B', dist_ly:860,   ra_deg:78.6,  dec_deg:-8.2,  temp:12100,mass:21.0, luminosity:1.2e5 },
                                { name:'Polaris',          typeKey:'F', dist_ly:433,   ra_deg:37.9,  dec_deg:89.3,  temp:6015, mass:5.40, luminosity:2500  },
                                { name:'Aldebaran',        typeKey:'K', dist_ly:65.3,  ra_deg:68.9,  dec_deg:16.5,  temp:3910, mass:1.16, luminosity:439   },
                                { name:'Spica',            typeKey:'B', dist_ly:250,   ra_deg:201.3, dec_deg:-11.2, temp:25300,mass:10.3, luminosity:2e4   },
                                { name:'Antares',          typeKey:'O', dist_ly:550,   ra_deg:247.4, dec_deg:-26.4, temp:3400, mass:12.0, luminosity:6e4   },
                                { name:'Deneb',            typeKey:'A', dist_ly:2600,  ra_deg:310.4, dec_deg:45.3,  temp:8525, mass:20.0, luminosity:2e5   },
                                { name:'Canopus',          typeKey:'F', dist_ly:310,   ra_deg:95.9,  dec_deg:-52.7, temp:7350, mass:8.0,  luminosity:1.0e4 },
                                ];
                                
                                // Convert catalog entry → scene-space Vector3 (galaxy kly units)
                                function catalogToScenePos(entry) {
                                const ra  = entry.ra_deg  * Math.PI / 180;
                                const dec = entry.dec_deg * Math.PI / 180;
                                const d   = entry.dist_ly / 1000; // kly
                                return new THREE.Vector3(
                                    d * Math.cos(dec) * Math.cos(ra),
                                    d * Math.sin(dec),
                                    d * Math.cos(dec) * Math.sin(ra)
                                );
                                }
                                
                                // ── STAR SPECTRAL TYPES — Full Physics Model ─────────────
                                // temp: K, radius: R☉, luminosity: L☉, mass: M☉
                                // habZoneFactor: multiplier for habitable zone distance
                                const STAR_TYPES = {
                                'O': { color:0x9bb0ff, temp:[30000,50000], mass:[20,150],   radius:[6.6,100],    prob:0.00003, luminosity:[30000,2000000], name:'Blue Giant',     lightIntensity:8,  habZoneFactor:20  },
                                'B': { color:0xaabfff, temp:[10000,30000], mass:[2,20],     radius:[1.8,6.6],    prob:0.0013,  luminosity:[100,30000],    name:'Blue-White',     lightIntensity:6,  habZoneFactor:8   },
                                'A': { color:0xcad7ff, temp:[7500,10000],  mass:[1.4,2.1],  radius:[1.4,1.8],    prob:0.006,   luminosity:[5,25],         name:'White',          lightIntensity:4,  habZoneFactor:2.5 },
                                'F': { color:0xf8f7ff, temp:[6000,7500],   mass:[1.04,1.4], radius:[1.15,1.4],   prob:0.03,    luminosity:[1.5,5],        name:'Yellow-White',   lightIntensity:3.5,habZoneFactor:1.5 },
                                'G': { color:0xfff4ea, temp:[5200,6000],   mass:[0.8,1.04], radius:[0.96,1.15],  prob:0.076,   luminosity:[0.6,1.5],      name:'Yellow Dwarf',   lightIntensity:3,  habZoneFactor:1.0 },
                                'K': { color:0xffd2a1, temp:[3700,5200],   mass:[0.45,0.8], radius:[0.7,0.96],   prob:0.121,   luminosity:[0.08,0.6],     name:'Orange Dwarf',   lightIntensity:2.5,habZoneFactor:0.6 },
                                'M': { color:0xffcc6f, temp:[2400,3700],   mass:[0.08,0.45],radius:[0.1,0.7],    prob:0.765,   luminosity:[0.0001,0.08],  name:'Red Dwarf',      lightIntensity:2,  habZoneFactor:0.3 },
                                'WD':{ color:0xe8e8ff, temp:[8000,40000],  mass:[0.5,1.4],  radius:[0.008,0.02], prob:0.005,   luminosity:[0.0001,0.5],   name:'White Dwarf',    lightIntensity:1.5,habZoneFactor:0.1 },
                                'NS':{ color:0xaaffff, temp:[1e5,1e6],     mass:[1.4,3],    radius:[1e-5,2e-5],  prob:0.001,   luminosity:[0.01,1000],    name:'Neutron Star',   lightIntensity:1,  habZoneFactor:0.05},
                                'BH':{ color:0x220033, temp:[0,0],         mass:[3,100],    radius:[0,0],        prob:0.0001,  luminosity:[0,0],          name:'Black Hole',     lightIntensity:0,  habZoneFactor:0   },
                                };
                                
                                // Star type probability table
                                const STAR_PROB_TABLE = [];
                                for (const [k,v] of Object.entries(STAR_TYPES)) {
                                for (let i=0; i<Math.round(v.prob*10000); i++) STAR_PROB_TABLE.push(k);
                                }
                                
                                // ── PLANET TYPES — Full Physical Classification ──────────
                                const PLANET_TYPES = [
                                { name:'Terrestrial',  color:0x4a9eff, emoji:'🌍', radiusRange:[0.4,1.6],  moonProb:0.6, atmProb:0.8, ringProb:0.02 },
                                { name:'Desert World', color:0xd4882a, emoji:'🏜',  radiusRange:[0.3,1.4],  moonProb:0.4, atmProb:0.5, ringProb:0.01 },
                                { name:'Ocean World',  color:0x1a6aff, emoji:'🌊', radiusRange:[0.5,2.0],  moonProb:0.7, atmProb:0.95,ringProb:0.02 },
                                { name:'Ice World',    color:0xc8f0ff, emoji:'❄️', radiusRange:[0.3,1.2],  moonProb:0.5, atmProb:0.4, ringProb:0.1  },
                                { name:'Lava World',   color:0xff3300, emoji:'🌋', radiusRange:[0.4,1.5],  moonProb:0.2, atmProb:0.6, ringProb:0.0  },
                                { name:'Gas Giant',    color:0xf4a460, emoji:'🪐', radiusRange:[4.0,15.0], moonProb:1.0, atmProb:1.0, ringProb:0.6  },
                                { name:'Ice Giant',    color:0x88bbff, emoji:'🔵', radiusRange:[3.0,6.0],  moonProb:0.9, atmProb:1.0, ringProb:0.4  },
                                { name:'Toxic World',  color:0x66ff44, emoji:'☠️', radiusRange:[0.4,1.5],  moonProb:0.3, atmProb:0.9, ringProb:0.0  },
                                { name:'Barren Moon',  color:0x888888, emoji:'🌑', radiusRange:[0.1,0.5],  moonProb:0.0, atmProb:0.1, ringProb:0.0  },
                                { name:'Exotic',       color:0xff00ff, emoji:'✨', radiusRange:[0.5,3.0],  moonProb:0.5, atmProb:0.7, ringProb:0.2  },
                                { name:'Rogue',        color:0x334455, emoji:'🪨', radiusRange:[0.1,0.8],  moonProb:0.0, atmProb:0.0, ringProb:0.0  },
                                ];
                                
                                // ── NAME GENERATORS ──────────────────────────────────────
                                const NAME_PARTS = {
                                prefix: ['Kep','Gal','Sol','Arc','Vex','Zor','Mel','Tau','Sig','Omi','Alph','Beta','Del','Eps','Zet','Ksi','Psi','Rho','Phi','Chi'],
                                mid:    ['ar','or','an','ix','us','on','en','ax','um','os','ia','el','is','ox','ur','as','in','et','ul','em'],
                                suffix: ['ima','ara','oni','eus','ius','pha','ira','anu','eli','odi','exa','ari','eos','ora','yla'],
                                num:    ['I','II','III','IV','V','VI','VII','VIII'],
                                greek:  ['Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta','Iota','Kappa','Lambda','Mu','Nu','Xi','Omicron'],
                                const_: ['Cygni','Lyrae','Draconis','Orionis','Tauri','Leonis','Aquarii','Scorpii','Virginis','Persei','Aurigae','Geminorum','Herculis','Ophiuchi','Sagittarii'],
                                bayer:  ['a','b','c','d','e'],
                                };
                                function genStarName(rng) {
                                const t = rng.int(0, 4);
                                if (t===0) return rng.pick(NAME_PARTS.greek) + ' ' + rng.pick(NAME_PARTS.const_);
                                if (t===1) return rng.pick(NAME_PARTS.prefix) + rng.pick(NAME_PARTS.mid) + rng.pick(NAME_PARTS.suffix) + '-' + rng.int(100,9999);
                                if (t===2) return 'HD ' + rng.int(10000,999999);
                                if (t===3) return 'HIP ' + rng.int(1000, 120000);
                                return 'GJ ' + rng.int(100,9999) + rng.pick(NAME_PARTS.bayer);
                                }
                                function genPlanetName(starName, idx, rng) {
                                return starName + ' ' + NAME_PARTS.num[idx % NAME_PARTS.num.length];
                                }
                                
                                // ── PERLIN NOISE (2D) ─────────────────────────────────────
                                class PerlinNoise {
                                constructor(seed) {
                                    const rng = new SeededRNG(seed);
                                    this.perm = new Array(512);
                                    const p = Array.from({length:256},(_,i)=>i);
                                    for (let i=255;i>0;i--) {
                                    const j = Math.floor(rng.next()*(i+1));
                                    [p[i],p[j]]=[p[j],p[i]];
                                    }
                                    for (let i=0;i<512;i++) this.perm[i]=p[i&255];
                                }
                                fade(t){return t*t*t*(t*(t*6-15)+10);}
                                lerp(a,b,t){return a+t*(b-a);}
                                grad(hash,x,y,z){
                                    const h=hash&15, u=h<8?x:y, v=h<4?y:h===12||h===14?x:z;
                                    return ((h&1)?-u:u)+((h&2)?-v:v);
                                }
                                noise(x,y,z=0){
                                    const X=Math.floor(x)&255, Y=Math.floor(y)&255, Z=Math.floor(z)&255;
                                    x-=Math.floor(x); y-=Math.floor(y); z-=Math.floor(z);
                                    const u=this.fade(x), v=this.fade(y), w=this.fade(z);
                                    const p=this.perm;
                                    const A=p[X]+Y, AA=p[A]+Z, AB=p[A+1]+Z, B=p[X+1]+Y, BA=p[B]+Z, BB=p[B+1]+Z;
                                    return this.lerp(
                                    this.lerp(this.lerp(this.grad(p[AA],x,y,z),this.grad(p[BA],x-1,y,z),u),
                                                this.lerp(this.grad(p[AB],x,y-1,z),this.grad(p[BB],x-1,y-1,z),u),v),
                                    this.lerp(this.lerp(this.grad(p[AA+1],x,y,z-1),this.grad(p[BA+1],x-1,y,z-1),u),
                                                this.lerp(this.grad(p[AB+1],x,y-1,z-1),this.grad(p[BB+1],x-1,y-1,z-1),u),v),w);
                                }
                                fbm(x, y, z=0, octaves=6, lacunarity=2, gain=0.5){
                                    let val=0, amp=1, freq=1, max=0;
                                    for(let i=0; i<octaves; i++){
                                    val += this.noise(x*freq, y*freq, z*freq) * amp;
                                    max += amp; amp *= gain; freq *= lacunarity;
                                    }
                                    return val/max;
                                }
                                }
                                
                                // ── GALAXY GENERATOR ─────────────────────────────────────
                                class GalaxyGenerator {
                                constructor() {
                                    this.noise = new PerlinNoise(GALAXY.GALAXY_SEED);
                                    this.spiralNoise = new PerlinNoise(GALAXY.GALAXY_SEED^0xABCDEF);
                                }
                                
                                // Density function — returns star density at (r, theta) in galaxy
                                // Uses logarithmic spiral arm model
                                densityAt(r, theta) {
                                    if (r > GALAXY.RADIUS_KLY) return 0;
                                
                                    // Galactic bulge (Hernquist profile approximation)
                                    const bulgeDensity = Math.exp(-r / GALAXY.BULGE_RADIUS) * 5.0;
                                
                                    // Disk (exponential profile)
                                    const diskDensity = Math.exp(-r / (GALAXY.RADIUS_KLY * 0.4));
                                
                                    // Spiral arms (logarithmic spiral)
                                    let armDensity = 0;
                                    for (let arm=0; arm<GALAXY.NUM_ARMS; arm++) {
                                    const armAngle = (arm / GALAXY.NUM_ARMS) * Math.PI * 2;
                                    // Logarithmic spiral: theta = ln(r/r0)/k + theta0
                                    const spiralAngle = armAngle + Math.log(Math.max(r,0.1)/2) * GALAXY.ARM_TWIST;
                                    let angleDiff = ((theta - spiralAngle) % (Math.PI*2) + Math.PI*3) % (Math.PI*2) - Math.PI;
                                    // Gaussian falloff from arm center
                                    const armWidth = 0.3 + r*0.02;
                                    armDensity += Math.exp(-(angleDiff*angleDiff)/(2*armWidth*armWidth));
                                    }
                                    armDensity *= diskDensity;
                                
                                    // Add noise perturbation
                                    const nx = r * Math.cos(theta) / GALAXY.RADIUS_KLY;
                                    const ny = r * Math.sin(theta) / GALAXY.RADIUS_KLY;
                                    const perturbation = (this.noise.fbm(nx*3, ny*3, 0, 4)+1)*0.5;
                                
                                    return (bulgeDensity + armDensity * 2.0) * (0.7 + 0.3*perturbation);
                                }
                            
                            // Generate N galaxy stars for rendering
                            generateGalaxyParticles(count) {
                                const positions = new Float32Array(count * 3);
                                const colors = new Float32Array(count * 3);
                                const sizes = new Float32Array(count);
                                const rng = new SeededRNG(GALAXY.GALAXY_SEED);
                            
                                let placed = 0, attempts = 0;
                            
                                // ── Inject real catalog stars first ──────────────────
                                for (const entry of REAL_STAR_CATALOG) {
                                if (placed >= count) break;
                                const pos = catalogToScenePos(entry);
                                positions[placed*3]   = pos.x;
                                positions[placed*3+1] = pos.y;
                                positions[placed*3+2] = pos.z;
                                const c = new THREE.Color(STAR_TYPES[entry.typeKey]?.color || 0xffffff);
                                colors[placed*3]   = Math.min(1, c.r * 1.2);
                                colors[placed*3+1] = Math.min(1, c.g * 1.2);
                                colors[placed*3+2] = Math.min(1, c.b * 1.2);
                                sizes[placed] = 2.5; // slightly larger so real stars stand out
                                galaxyStarDB.push({
                                    name: entry.name,
                                    index: placed,
                                    position: pos.clone(),
                                    sectorX: Math.floor(pos.x),
                                    sectorZ: Math.floor(pos.z),
                                    starIndex: placed,
                                    typeKey: entry.typeKey,
                                    typeName: STAR_TYPES[entry.typeKey]?.name || 'Unknown',
                                    isRealStar: true,
                                    realData: entry,
                                });
                                placed++;
                                }
                            
                                // ── Procedural stars ─────────────────────────────────
                                while (placed < count && attempts < count * 20) {
                                attempts++;
                                const r = Math.pow(rng.next(), 0.5) * GALAXY.RADIUS_KLY;
                                const theta = rng.next() * Math.PI * 2;
                                const density = this.densityAt(r, theta);
                                if (rng.next() > density / 6.0) continue;
                            
                                const x = r * Math.cos(theta);
                                const z = r * Math.sin(theta);
                                const diskThick = GALAXY.THICKNESS_KLY * (0.2 + Math.exp(-r/GALAXY.BULGE_RADIUS) * 2);
                                const y = (rng.next()*2-1) * diskThick * (rng.next() < 0.95 ? 1 : rng.range(1,5));
                            
                                positions[placed*3]   = x;
                                positions[placed*3+1] = y;
                                positions[placed*3+2] = z;
                            
                                const localSeed = SeededRNG.hash(Math.round(x*100), Math.round(z*100));
                                const localRng = new SeededRNG(localSeed);
                                const typeKey = this.sampleStarType(localRng);
                                const st = STAR_TYPES[typeKey];
                                const c = new THREE.Color(st.color);
                            
                                const variation = localRng.range(0.8,1.2);
                                colors[placed*3]   = Math.min(1, c.r * variation);
                                colors[placed*3+1] = Math.min(1, c.g * variation);
                                colors[placed*3+2] = Math.min(1, c.b * variation);
                                sizes[placed] = typeKey==='O'||typeKey==='B' ? rng.range(2,4) : rng.range(0.5,1.5);
                            
                                const dbRng = new SeededRNG(SeededRNG.hash(Math.round(x*137), Math.round(z*137), placed));
                                const starName = genStarName(dbRng);
                                galaxyStarDB.push({
                                    name: starName,
                                index: placed,
                                position: new THREE.Vector3(x, y, z),
                                sectorX: Math.floor(x),
                                sectorZ: Math.floor(z),
                                starIndex: placed,
                                typeKey,
                                typeName: st.name,
                                isRealStar: false,
                            });
                        
                            placed++;
                            }
                            return { positions, colors, sizes, count: placed };
                        }
                        
                        sampleStarType(rng) {
                            // Weighted random star type
                            const r = rng.next();
                            let cumulative = 0;
                            for (const [k,v] of Object.entries(STAR_TYPES)) {
                            cumulative += v.prob;
                            if (r <= cumulative) return k;
                            }
                            return 'M';
                        }
                        
                        // Generate a full star system deterministically from coordinates
                        // Accepts optional override for real catalog stars
                        generateStarSystem(sectorX, sectorZ, starIndex, realStarOverride) {
                            const seed = SeededRNG.hash(GALAXY.GALAXY_SEED, sectorX*1000+sectorZ, starIndex);
                            const rng = new SeededRNG(seed);
                        
                            const typeKey = realStarOverride ? realStarOverride.typeKey : this.sampleStarType(rng);
                            const st = STAR_TYPES[typeKey];
                        
                            // Real stars use catalog data; procedural use generated name
                            const starName = realStarOverride ? realStarOverride.name : genStarName(rng);
                            const mass     = realStarOverride ? realStarOverride.mass      : rng.range(st.mass[0],      st.mass[1]);
                            const temp     = realStarOverride ? realStarOverride.temp      : (st.temp[0] > 0 ? rng.range(st.temp[0], st.temp[1]) : 0);
                            const luminosity = realStarOverride ? realStarOverride.luminosity : rng.range(st.luminosity[0], st.luminosity[1]);
                        
                            const isBinary = !realStarOverride && rng.next() < 0.35 && typeKey !== 'BH' && typeKey !== 'NS';
                            const isTriple = isBinary && rng.next() < 0.15;
                        
                            // Habitable zone using Stefan-Boltzmann: d_hz = sqrt(L/L☉) AU
                            const habZoneInner = Math.sqrt(luminosity / 1.1);   // inner edge (AU)
                            const habZoneOuter = Math.sqrt(luminosity / 0.53);  // outer edge (AU)
                        
                            const numPlanets = typeKey==='BH'||typeKey==='NS' ? rng.int(0,2) :
                                            typeKey==='M' ? rng.int(1,5) :
                                        typeKey==='G' ? rng.int(2,9) : rng.int(1,8);
                        const planets = [];
                    
                        // Space planets using Titius-Bode-inspired exponential spacing in real AU
                        for (let i=0; i<numPlanets; i++) {
                        // Spacing: inner rocky planets < 2 AU, gas giants 5-30 AU
                        const orbitAU = 0.3 * Math.pow(2.0, i * (typeKey==='M' ? 0.5 : 0.8));
                        const isHabitable = orbitAU >= habZoneInner && orbitAU <= habZoneOuter;
                        const planetSeed = SeededRNG.hash(seed, i+1);
                        planets.push(this.generatePlanet(i, orbitAU, isHabitable, planetSeed, starName, typeKey));
                        }
                    
                        return {
                        name: starName,
                        typeKey,
                        typeName: st.name,
                        color: st.color,
                        mass,
                        temp,
                        luminosity,
                        isBinary, isTriple,
                        planets,
                        numPlanets,
                        hasBlackHole: typeKey==='BH',
                        sectorX, sectorZ, starIndex,
                        habZoneInner, habZoneOuter,
                        lightIntensity: st.lightIntensity || 3,
                        isRealStar: !!realStarOverride,
                        };
                    }
                    
                    generatePlanet(index, orbitAU, isHabitable, seed, starName, starTypeKey) {
                        const rng = new SeededRNG(seed);
                        let pType;
                    
                        // Classify planet by stellar distance and habitability
                        if (isHabitable) {
                        const r = rng.next();
                        pType = r < 0.45 ? PLANET_TYPES[0] :  // Terrestrial
                                r < 0.70 ? PLANET_TYPES[2] :  // Ocean World
                                r < 0.85 ? PLANET_TYPES[1] :  // Desert
                                            PLANET_TYPES[7];   // Toxic
                        } else if (orbitAU < 0.4) {
                        pType = rng.next() < 0.7 ? PLANET_TYPES[4] : PLANET_TYPES[1]; // Lava or Desert
                    } else if (orbitAU > 4.0 && orbitAU < 15.0) {
                    pType = rng.next() < 0.6 ? PLANET_TYPES[5] : PLANET_TYPES[6]; // Gas Giant or Ice Giant
                    } else if (orbitAU >= 15.0) {
                    pType = rng.next() < 0.5 ? PLANET_TYPES[6] : PLANET_TYPES[3]; // Ice Giant or Ice World
                    } else {
                    const choices = [PLANET_TYPES[0],PLANET_TYPES[1],PLANET_TYPES[3],PLANET_TYPES[8]];
                    pType = rng.pick(choices);
                    }
                
                    const [rMin, rMax] = pType.radiusRange;
                    const radiusEarth = rng.range(rMin, rMax);
                    const gravity     = rng.range(0.1 * radiusEarth, 2.5 * radiusEarth);
                    const hasAtmosphere = rng.next() < pType.atmProb;
                    const hasLife     = isHabitable && rng.next() < 0.3;
                    const hasCiv      = hasLife && rng.next() < 0.08;
                    const hasRings    = rng.next() < pType.ringProb;
                
                    // Kepler: T² = a³ (T in years, a in AU) → T = a^1.5
                    const orbitalPeriod = Math.pow(orbitAU, 1.5);  // years
                
                    // Moon count scales with planet size and type
                    const maxMoons = pType.name === 'Gas Giant'  ? 4 :
                                    pType.name === 'Ice Giant'  ? 3 :
                                    pType.moonProb > 0.5         ? 2 : 1;
                    const numMoons = Math.floor(rng.next() < pType.moonProb ? rng.range(1, maxMoons+1) : 0);
                
                    return {
                    name: genPlanetName(starName, index, rng),
                    type: pType,
                    orbitAU,
                radiusEarth,
                gravity,
                tempK: 278 / Math.sqrt(orbitAU) * rng.range(0.7, 1.5),
                hasAtmosphere,
                atmosphereDensity: hasAtmosphere ? rng.range(0.01, 5.0) : 0,
                hasLife,
                hasCiv,
                hasRings,
                numMoons,
                axialTilt: rng.range(0, 45),
                dayLength: rng.range(6, 72),
                orbitalPeriod,
                magneticField: rng.next() < 0.6,
                moons: pType.name==='Gas Giant' ? rng.int(2,20) : rng.int(0,3),
                color: pType.color,
                noiseSeed: seed,
                };
            }
            }
            
            // ── THREE.JS SCENE SETUP ─────────────────────────────────
            const scene = new THREE.Scene();
            const _cvs = document.getElementById('canvas');
            const renderer = new THREE.WebGLRenderer({canvas: _cvs, antialias: true});
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor(0x000007);
        
        const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 50000);
        function _resizeRenderer() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (!w || !h) return;
        // pixelRatio=1 so draw buffer = CSS size exactly. No mismatch, no half-planet.
        renderer.setPixelRatio(1);
        renderer.setSize(w, h);
        _cvs.style.width  = w + 'px';
        _cvs.style.height = h + 'px';
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        }
        
        const _vvW = () => window.innerWidth;
        const _vvH = () => window.innerHeight;
        
    _resizeRenderer();
    
    // ── STATE MACHINE ─────────────────────────────────────────
    const STATE = {
    GALAXY: 'galaxy',
    SECTOR: 'sector',
    SYSTEM: 'system',
    ORBIT: 'orbit',
    SURFACE: 'surface',
    };
    let currentState = STATE.GALAXY;
    let selectedSystem = null;
    let currentPlanetIndex = 0;
    
    const gen = new GalaxyGenerator();
    
    // ── TARGETING STATE ───────────────────────────────────────
    // selectedStar: the star currently under the center reticle
    // - index      : particle index into galaxyParticles geometry
    // - position   : THREE.Vector3 in galaxy space
    // - sectorX/Z  : derived logical sector coords
// - starIndex  : local star index within sector (used for system gen)
// - system     : lazily-generated StarSystem data
let selectedStar = null;
let selectedStarLocked = false; // true = selected via search/tap, reticle won't clear it

// Cache of previous highlighted star index so we can restore its size
let _prevHighlightIdx = -1;
let _prevHighlightSize = 0;

// Raycaster fixed to screen center (0,0 in NDC = centre)
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 1.5;
const _screenCenter = new THREE.Vector2(0, 0);
// Track mouse for hover highlighting
window.addEventListener('mousemove', e => {
  _screenCenter.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  _screenCenter.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// DOM refs cached once
const _targetRing   = document.getElementById('target-ring');
const _starInfoPane = document.getElementById('star-info');
const _warpBtn      = document.getElementById('warp-btn');

// ── ORBIT CONTROLS ────────────────────────────────────────
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping  = true;
controls.dampingFactor  = 0.06;
controls.enableZoom     = true;
controls.enablePan      = false;
controls.minDistance    = 1;
controls.maxDistance    = 300;
controls.target.set(0, 0, 0);
controls.update();

// ── DYNAMIC CAMERA TARGET ─────────────────────────────────
// Single source of truth — every transition writes here, then
// calls setSceneCamera().  The animation loop copies it into
// controls.target so OrbitControls always orbits the right object.
const cameraTarget = new THREE.Vector3(0, 0, 0);

let camDist = 120;

// Called once per scene-transition to teleport camera to a new
// orbit center.  Do NOT call this every frame.
function setSceneCamera(targetVec, distance, minDist, maxDist) {
  cameraTarget.copy(targetVec);
  camDist = distance;

  controls.target.copy(cameraTarget);
  controls.minDistance = minDist  !== undefined ? minDist  : Math.max(0.05, distance * 0.04);
  controls.maxDistance = maxDist  !== undefined ? maxDist  : distance * 8;

  // Place camera at a comfortable viewing angle
  camera.position.set(
    cameraTarget.x + distance * 0.55,
    cameraTarget.y + distance * 0.45,
    cameraTarget.z + distance * 0.75
  );
  // Re-sync internal spherical state so update() doesn't fight this position
  controls.reset();
}

// Legacy no-arg helper kept so old call-sites that pass only
// camDist still work (they all got updated below, but safety net)
function updateCamera() {
  controls.target.copy(cameraTarget);
  controls.update();
}

// ── SCENE OBJECTS ─────────────────────────────────────────
let galaxyParticles, nebulaParticles, coreGlow;
let systemObjects = [];
let planetObjects = [];
let terrainMesh = null;
let orbitLines = [];
let ambientParticles = null;
let sunMesh = null;

// ── STAR NAME DATABASE ────────────────────────────────────
// Populated during createGalaxy() — allows instant text search
const galaxyStarDB = [];

// ── GALAXY CREATION ───────────────────────────────────────
function createGalaxy() {
  const data = gen.generateGalaxyParticles(GALAXY.STARS_VISIBLE);

  // Star particles
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(data.colors, 3));
  geo.setAttribute('size',     new THREE.BufferAttribute(data.sizes, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      time: {value: 0},
      pixelRatio: {value: renderer.getPixelRatio()},
    },
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      uniform float time;
      uniform float pixelRatio;
      void main(){
        vColor = color;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * pixelRatio * (300.0 / -mvPos.z);
        gl_PointSize = clamp(gl_PointSize, 0.5, 6.0);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main(){
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if(d > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.0, 0.5, d);
        gl_FragColor = vec4(vColor, alpha * alpha);
      }
    `,
    transparent: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  galaxyParticles = new THREE.Points(geo, mat);
  scene.add(galaxyParticles);

  // Galactic core glow
  const coreGeo = new THREE.SphereGeometry(6, 32, 32);
  const coreMat = new THREE.ShaderMaterial({
    uniforms: { time: {value:0} },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv;
      uniform float time;
      void main(){
        vec2 c = vUv - 0.5;
        float d = length(c);
        float alpha = 1.0-smoothstep(0.0,0.5,d);
        alpha = pow(alpha, 2.0);
        vec3 col = mix(vec3(1.0,0.8,0.4), vec3(1.0,0.3,0.8), d*2.0);
        gl_FragColor = vec4(col * 1.5, alpha * 0.7);
      }
    `,
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.FrontSide,
  });
  coreGlow = new THREE.Mesh(coreGeo, coreMat);
  scene.add(coreGlow);

  // Nebula cloud particles
  createNebulae();
}

function createNebulae() {
  const count = 8000;
  const positions = new Float32Array(count*3);
  const colors = new Float32Array(count*3);
  const sizes = new Float32Array(count);
  const rng = new SeededRNG(0xCAFEBABE);
  const noise = new PerlinNoise(0xCAFEBABE);

  const nebulaColors = [
    [0.8,0.2,0.9], [0.2,0.5,1.0], [1.0,0.3,0.1],
    [0.1,0.9,0.5], [0.9,0.8,0.2], [0.5,0.2,0.8],
  ];

  for (let i=0; i<count; i++) {
    const r = rng.range(5, GALAXY.RADIUS_KLY*0.8);
    const theta = rng.next()*Math.PI*2;
    // Place near spiral arms using noise
    const nx = Math.cos(theta)*r/GALAXY.RADIUS_KLY;
    const ny = Math.sin(theta)*r/GALAXY.RADIUS_KLY;
    const armWeight = gen.densityAt(r, theta);
    if (rng.next() > armWeight/4+0.1) { i--; continue; } // Reject sparse areas (keep)

    positions[i*3]   = r*Math.cos(theta) + rng.range(-2,2);
    positions[i*3+1] = rng.range(-0.3,0.3);
    positions[i*3+2] = r*Math.sin(theta) + rng.range(-2,2);

    const col = rng.pick(nebulaColors);
    colors[i*3] = col[0]; colors[i*3+1]=col[1]; colors[i*3+2]=col[2];
    sizes[i] = rng.range(3,12);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors,3));
  geo.setAttribute('size',     new THREE.BufferAttribute(sizes,1));
  const mat = new THREE.ShaderMaterial({
    uniforms:{time:{value:0}},
    vertexShader:`
      attribute float size; varying vec3 vColor;
      uniform float time;
      void main(){
        vColor=color;
        vec4 mvPos=modelViewMatrix*vec4(position,1.0);
        gl_PointSize=size*(200.0/-mvPos.z); gl_PointSize=clamp(gl_PointSize,1.0,20.0);
        gl_Position=projectionMatrix*mvPos;
      }
    `,
    fragmentShader:`
      varying vec3 vColor;
      void main(){
        vec2 uv=gl_PointCoord-0.5; float d=length(uv);
        if(d>0.5) discard;
        float a=1.0-smoothstep(0.1,0.5,d);
        gl_FragColor=vec4(vColor*1.2,a*0.15);
      }
    `,
    transparent:true, vertexColors:true, depthWrite:false,
    blending:THREE.AdditiveBlending,
  });
  nebulaParticles = new THREE.Points(geo, mat);
  scene.add(nebulaParticles);
}

// ── STAR SYSTEM SCENE ─────────────────────────────────────
function createStarSystem(system) {
  clearSystemObjects();

  // ── Shadow mapping ──────────────────────────────────────
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

  const stData    = STAR_TYPES[system.typeKey];
  const starColor = new THREE.Color(stData.color);
  const starRadius = system.typeKey==='BH' ? 0.5 :
                     system.typeKey==='NS' ? 0.1 :
                     Math.max(0.35, stData.radius[0] * 0.35);

  // ── 1. STAR IS THE ONLY REAL LIGHT SOURCE ───────────────
  const starLightColor = system.typeKey==='BH' ? 0x220066 :
                         system.typeKey==='NS' ? 0x88ffff : stData.color;
  const starIntensity  = Math.min(3.0, (system.lightIntensity ?? 3) * 0.4);

  // HemisphereLight: sky colour = star tint, ground = black.
  const hemiLight = new THREE.HemisphereLight(
    starLightColor,
    0x000000,
    0.04
  );
  scene.add(hemiLight);
  systemObjects.push(hemiLight);

  const starLight = new THREE.PointLight(starLightColor, starIntensity, 500);
  starLight.position.set(0, 0, 0);
  starLight.castShadow = true;
  starLight.shadow.mapSize.width  = 2048;
  starLight.shadow.mapSize.height = 2048;
  starLight.shadow.camera.near    = 0.5;
  starLight.shadow.camera.far     = 500;
  starLight.shadow.bias           = -0.0005;
  scene.add(starLight);
  systemObjects.push(starLight);

  // ── 2. STAR CORE SURFACE (bright animated plasma) ─────────
  // ── 2. STAR CORE SURFACE ─────────────────────────────────────
  const starGeo = new THREE.SphereGeometry(starRadius, 128, 128);
  const starMat = new THREE.ShaderMaterial({
    uniforms: {
      time:        { value: 0 },
      color:       { value: starColor.clone() },
      isBlackHole: { value: system.typeKey === 'BH' ? 1.0 : 0.0 },
    },
    vertexShader: `
      varying vec3 vNormal; varying vec2 vUv; varying vec3 vViewDir;
      void main(){
        vNormal  = normalize(normalMatrix * normal);
        vUv      = uv;
        vec4 mv  = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float time; uniform vec3 color; uniform float isBlackHole;
      varying vec3 vNormal; varying vec2 vUv; varying vec3 vViewDir;

      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float sn(vec2 p){
        vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
        return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);
      }
      float fbm(vec2 p, int oct){
        float v=0.,a=.5;
        for(int i=0;i<8;i++){ if(i>=oct) break; v+=a*sn(p); p*=2.07; a*=.5; }
        return v;
      }

      void main(){
        // Black hole special case
        if(isBlackHole>0.5){
          float c=max(0.,dot(normalize(vNormal),vViewDir));
          float rim=1.-c;
          vec3 accretion=mix(vec3(0.8,0.2,1.),vec3(0.2,0.,0.6),pow(rim,1.5));
          gl_FragColor=vec4(mix(vec3(0),accretion,pow(rim,1.2)),1.); return;
        }

        // === SURFACE: real solar look ===
        // Large convection pattern (granulation cells ~5-10% brightness variation)
        float conv  = fbm(vUv*4.  + vec2(time*.025, -time*.018), 4);
        // Medium plasma detail
        float mid   = fbm(vUv*12. + vec2(time*.055,  time*.03 ), 4);
        // Fine bright point granules (brighter dots, NOT darker patches)
        float fine  = fbm(vUv*28. + vec2(-time*.08,  time*.06 ), 3);

        // Base: star is BRIGHT — start from full star colour, not dark
        vec3 col = color * 1.35;

        // Granulation: subtle brightness modulation only (±8%), no dark splotches
        col *= (0.94 + conv*0.12 + mid*0.08 + fine*0.06);

        // Hot bright plasma lanes (brighter, not darker)
        col += color * 0.18 * smoothstep(0.55, 0.75, fine);

        // Sunspots — TINY, RARE, and SUBTLE (real sun has few spots, hard to see)
        float spotNoise = fbm(vUv*7. + vec2(-time*.008, time*.006), 3);
        // Only extremely high noise values become spots (top 5% of noise)
        float spotMask  = smoothstep(0.74, 0.80, spotNoise);
        // Real sunspots are ~80% as bright as surroundings, not coal-black
        col = mix(col, col * 0.70, spotMask * 0.6);

        // Centre of sun is hotter/whiter, edges slightly cooler (limb darkening)
        float ndv = max(0., dot(normalize(vNormal), vViewDir));
        // Standard Eddington limb darkening: I(mu) = 0.4 + 0.6*mu
        float limb = 0.4 + 0.6 * ndv;
        col *= limb;

        // Ensure always very bright — clamp to avoid HDR blowout issues
        col = clamp(col, 0.0, 2.5);
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.FrontSide,
  });

  sunMesh = new THREE.Mesh(starGeo, starMat);
  sunMesh.castShadow = sunMesh.receiveShadow = false;
  scene.add(sunMesh);
  systemObjects.push(sunMesh);

  // ── 3. GLOW + CORONA — two large billboard sprites, NO sphere shells ──
  // Sprites always face the camera = zero ring artifacts
  {
    const rc  = starColor.clone();
    const hex = (v) => Math.min(255, Math.round(Math.max(0,v) * 255));

    // Inner corona sprite (tight bright ring)
    {
      const S = 512; const cv = document.createElement('canvas');
      cv.width = cv.height = S;
      const ctx = cv.getContext('2d'); const cx=S/2,cy=S/2;
      const g = ctx.createRadialGradient(cx,cy, S*0.14, cx,cy, S/2);
      g.addColorStop(0.00, `rgba(255,255,235,0.0)`);          // centre: transparent (star sphere covers this)
      g.addColorStop(0.10, `rgba(255,250,200,0.85)`);         // bright inner ring
      g.addColorStop(0.22, `rgba(${hex(rc.r)},${hex(rc.g*0.85+0.15)},${hex(rc.b*0.3)},0.55)`);
      g.addColorStop(0.40, `rgba(${hex(rc.r)},${hex(rc.g*0.6)},0,0.22)`);
      g.addColorStop(0.65, `rgba(${hex(rc.r*0.8)},${hex(rc.g*0.35)},0,0.07)`);
      g.addColorStop(1.00, `rgba(0,0,0,0)`);
      ctx.fillStyle=g; ctx.fillRect(0,0,S,S);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(cv), transparent:true,
        blending:THREE.AdditiveBlending, depthWrite:false,
      }));
      const ss = starRadius * 5.5;
      sp.scale.set(ss,ss,1);
      sp.castShadow=sp.receiveShadow=false;
      scene.add(sp); systemObjects.push(sp);
    }

    // Outer diffuse halo sprite
    {
      const S = 512; const cv = document.createElement('canvas');
      cv.width = cv.height = S;
      const ctx = cv.getContext('2d'); const cx=S/2,cy=S/2;
      const g = ctx.createRadialGradient(cx,cy, 0, cx,cy, S/2);
      g.addColorStop(0.00, `rgba(255,255,230,0.0)`);
      g.addColorStop(0.05, `rgba(255,250,210,0.5)`);
      g.addColorStop(0.18, `rgba(${hex(rc.r)},${hex(rc.g*0.75+0.1)},${hex(rc.b*0.2)},0.28)`);
      g.addColorStop(0.40, `rgba(${hex(rc.r*0.95)},${hex(rc.g*0.5)},0,0.10)`);
      g.addColorStop(0.65, `rgba(${hex(rc.r*0.7)},${hex(rc.g*0.25)},0,0.03)`);
      g.addColorStop(1.00, `rgba(0,0,0,0)`);
      ctx.fillStyle=g; ctx.fillRect(0,0,S,S);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(cv), transparent:true,
        blending:THREE.AdditiveBlending, depthWrite:false,
      }));
      const ss = starRadius * 22;
      sp.scale.set(ss,ss,1);
      sp.castShadow=sp.receiveShadow=false;
      scene.add(sp); systemObjects.push(sp);
    }
  }

  // ── Compute orbit radii (exponential Kepler spacing) ────
  const orbitScales = system.planets.map((_, i) => 2 + Math.pow(i + 1, 1.6) * 2);

  // Asteroid belt between rocky and gas giant zone
  if (system.numPlanets > 3) {
    const bi = orbitScales[2] + 0.4, bo = orbitScales[3] - 0.4;
    if (bo > bi + 0.5) createAsteroidBelt(bi, bo);
  } else if (system.numPlanets > 1) {
    const bi = orbitScales[system.numPlanets - 1] + 1.5;
    createAsteroidBelt(bi, bi + 2.0);
  }

  system.planets.forEach((planet, i) => createPlanetInSystem(planet, i, orbitScales[i]));
  createOortCloud();
}

// ─────────────────────────────────────────────────────────
function createPlanetInSystem(planet, index, orbitScale) {

  // ── Orbit guide line ────────────────────────────────────
  const orbPts = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    orbPts.push(new THREE.Vector3(orbitScale * Math.cos(a), 0, orbitScale * Math.sin(a)));
  }
  const orbitLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(orbPts),
    new THREE.LineBasicMaterial({ color: 0x223344, transparent: true, opacity: 0.22 })
  );
  scene.add(orbitLine); systemObjects.push(orbitLine);
  orbitLines.push({ line: orbitLine, a: orbitScale, planet, index });

  // ── Planet sizing ───────────────────────────────────────
  const pRadius  = Math.max(0.12, planet.radiusEarth * 0.18);
  const isGas    = planet.type.name === 'Gas Giant' || planet.type.name === 'Ice Giant';
  const pColor   = new THREE.Color(planet.color);

  // ── 5. PBR SURFACE MATERIAL ─────────────────────────────
  // All planets use MeshStandardMaterial so the star PointLight drives shading.
  // Each type gets appropriate roughness/metalness/emissive.
  const isOcean   = planet.type.name === 'Ocean World';
  const isIce     = planet.type.name === 'Ice World';
  const isLava    = planet.type.name === 'Lava World';

  // Build a slightly varied surface color using the base + noise-offset
  const surfaceColor = pColor.clone();
  // Secondary tint baked in for visual variety
  const tintSeed  = planet.noiseSeed % 7;
  const tintShift = [0.06, -0.04, 0.05, -0.05, 0.07, -0.03, 0.04][tintSeed];
  surfaceColor.offsetHSL(tintShift, 0, 0);

  const pMat = new THREE.MeshStandardMaterial({
    color:     isGas ? _buildGasGiantTexture(pColor, planet.noiseSeed) : surfaceColor,
    map:       isGas ? null : null,
    roughness: isOcean ? 0.04 : isIce ? 0.12 : isLava ? 0.88 : isGas ? 0.55 : 0.82,
    metalness: isIce ? 0.04 : isOcean ? 0.08 : 0.0,
    emissive:     isLava ? new THREE.Color(0.5, 0.06, 0.0) : new THREE.Color(0, 0, 0),
    emissiveIntensity: isLava ? 0.30 : 0.0,
    envMapIntensity: isOcean ? 0.6 : isIce ? 0.3 : 0.0,
    side: THREE.DoubleSide,
  });

  // For gas giants we apply a canvas texture for banding
  if (isGas) pMat.map = _buildGasGiantCanvasTex(pColor, planet.noiseSeed);

  // Gas giants use a ShaderMaterial overlay on top of lighting — keep bands
  // but fall back gracefully; use MeshStandardMaterial as the base so
  // star light still illuminates them.
  const pMesh = new THREE.Mesh(
    new THREE.SphereGeometry(pRadius, isGas ? 64 : 48, isGas ? 64 : 48),
    pMat
  );

  // ── 2. DAY / NIGHT SHADOW ──────────────────────────────
  pMesh.castShadow    = true;
  pMesh.receiveShadow = true;

  // ── 8. AXIAL ROTATION ──────────────────────────────────
  // Day length in hours → rotation speed in rad/s (scene time)
  // We scale so 24-hour Earth day = visible rotation in the sim.
  const rotSpeed = (2 * Math.PI) / (planet.dayLength * 0.8);
  pMesh.userData.rotSpeed = rotSpeed;
  // Axial tilt
  pMesh.rotation.z = (planet.axialTilt || 0) * Math.PI / 180;

  // Kepler orbit speed
  const orbitSpeed = BASE_ORBITAL_SPEED / Math.sqrt(Math.pow(orbitScale, 3));
  pMesh.userData = {
    ...pMesh.userData,
    planet, index, orbitScale, orbitSpeed, rotSpeed,
    orbitAngle: Math.random() * Math.PI * 2,
    moons: [],
  };

  scene.add(pMesh); systemObjects.push(pMesh); planetObjects.push(pMesh);
  pMesh.frustumCulled = false; // prevent half-clipping when camera is very close

  // ── 6. ATMOSPHERE GLOW ─────────────────────────────────
  if (planet.hasAtmosphere) {
    const atmColors = {
      'Terrestrial':  new THREE.Color(0.35, 0.55, 1.0),
      'Ocean World':  new THREE.Color(0.2,  0.5,  1.0),
      'Ice World':    new THREE.Color(0.7,  0.9,  1.0),
      'Desert World': new THREE.Color(0.9,  0.6,  0.3),
      'Lava World':   new THREE.Color(0.9,  0.25, 0.05),
      'Gas Giant':    new THREE.Color(0.85, 0.75, 0.55),
      'Ice Giant':    new THREE.Color(0.45, 0.65, 0.95),
      'Toxic World':  new THREE.Color(0.3,  0.85, 0.2),
      'Exotic':       new THREE.Color(0.85, 0.3,  0.9),
    };
    const atmCol = atmColors[planet.type.name] || new THREE.Color(0.4, 0.6, 1.0);
    const atmThickness = isGas ? 1.06 : 1.045;
    const atmGeo = new THREE.SphereGeometry(pRadius * atmThickness, 48, 48);
    const atmMat = new THREE.ShaderMaterial({
      uniforms: { atmColor: { value: atmCol }, density: { value: Math.min(1.0, planet.atmosphereDensity * 0.4) } },
      vertexShader: `varying vec3 vN; varying vec3 vViewDir;
        void main(){
          vN=normalize(normalMatrix*normal);
          vec4 mvPos=modelViewMatrix*vec4(position,1.0);
          vViewDir=normalize(-mvPos.xyz);
          gl_Position=projectionMatrix*mvPos;
        }`,
      fragmentShader: `
        uniform vec3 atmColor; uniform float density; varying vec3 vN; varying vec3 vViewDir;
        void main(){
          float rim = 1.0 - abs(dot(normalize(vN), normalize(vViewDir)));
          float a = pow(rim, 2.5) * density * 1.2;
          gl_FragColor = vec4(atmColor, clamp(a, 0.0, 0.7));
        }`,
      transparent: true, side: THREE.FrontSide,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const atmMesh = new THREE.Mesh(atmGeo, atmMat);
    atmMesh.castShadow = atmMesh.receiveShadow = false;
    scene.add(atmMesh); systemObjects.push(atmMesh);
    pMesh.userData.atmMesh = atmMesh;
  }

  // ── 7. GAS GIANT RINGS (multi-layer, shadow-capable) ────
  if (planet.hasRings) {
    const ringDefs = [
      { inner: 1.30, outer: 1.62, opacity: 0.60, hex: 0xd4b896 },
      { inner: 1.68, outer: 2.05, opacity: 0.40, hex: 0xb8997a },
      { inner: 2.12, outer: 2.40, opacity: 0.22, hex: 0x9a806a },
    ];
    const ringGroup = new THREE.Group();
    ringGroup.rotation.x = Math.PI / 2 + 0.20 + (Math.random() - 0.5) * 0.12;

    for (const rd of ringDefs) {
      const rGeo = new THREE.RingGeometry(pRadius * rd.inner, pRadius * rd.outer, 160);
      // Re-map UVs for radial gradient
      const pos = rGeo.attributes.position, uv = rGeo.attributes.uv;
      const span = pRadius * (rd.outer - rd.inner);
      for (let i = 0; i < uv.count; i++) {
        const vx = pos.getX(i), vz = pos.getZ(i);
        const d = Math.sqrt(vx * vx + vz * vz);
        uv.setXY(i, (d - pRadius * rd.inner) / span, 0.5);
      }
      uv.needsUpdate = true;

      const rc = new THREE.Color(rd.hex);
      const rMat = new THREE.MeshStandardMaterial({
        color: rc, roughness: 0.9, metalness: 0.0,
        transparent: true, opacity: rd.opacity,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      // Rings receive star light → natural shadowing on planet side
      rMesh.castShadow    = true;
      rMesh.receiveShadow = true;
      ringGroup.add(rMesh);
    }
    scene.add(ringGroup); systemObjects.push(ringGroup);
    pMesh.userData.ringMesh = ringGroup;
  }

  // ── 3 / 5 / 9. MOONS — PBR, real orbit hierarchy ────────
  const moonCount = planet.numMoons ?? Math.floor(Math.random() * (isGas ? 4 : 3));
  for (let m = 0; m < moonCount; m++) {
    const mRadius = pRadius * (0.14 + Math.random() * 0.22);
    const mOrbit  = pRadius * (3.0 + m * 2.0 + Math.random() * 1.2);
    // Kepler moon speed: faster for closer moons
    const mSpeed  = 0.35 / Math.sqrt(Math.pow(mOrbit / pRadius, 3));
    const mAngle  = Math.random() * Math.PI * 2;
    const mTilt   = (Math.random() - 0.5) * 0.4;

    // Moon surface: cratered grey rock via MeshStandardMaterial
    const greyBase = 0.28 + Math.random() * 0.30;
    const mColor   = new THREE.Color(greyBase, greyBase * 0.96, greyBase * 0.92);
    const mMat = new THREE.MeshStandardMaterial({
      color:     mColor,
      roughness: 0.92,
      metalness: 0.02,
      // Moons emit NO light — visibility purely from star illumination
    });
    const mMesh = new THREE.Mesh(
      new THREE.SphereGeometry(mRadius, 24, 24),
      mMat
    );

    // ── 3. Moons cast AND receive shadows (eclipses) ──────
    mMesh.castShadow    = true;
    mMesh.receiveShadow = true;
    // Moons rotate slowly on their own axis (tidally locked approximation)
    mMesh.userData = {
      moonOrbit: mOrbit, moonSpeed: mSpeed,
      moonAngle: mAngle, moonTilt:  mTilt,
      moonRotSpeed: 0.03 + Math.random() * 0.05,
    };
    scene.add(mMesh); systemObjects.push(mMesh);
    pMesh.userData.moons.push(mMesh);
  }
}

function rng01() { return 0.85 + Math.random() * 0.3; }

// ── GAS GIANT BAND TEXTURE ─────────────────────────────────
// Generates a 512×256 canvas texture with horizontal bands that
// MeshStandardMaterial can use — fully lit by the star PointLight.
function _buildGasGiantCanvasTex(baseColor, seed) {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const noise = new PerlinNoise(seed ^ 0xBA4D51);
  const r0 = baseColor.r, g0 = baseColor.g, b0 = baseColor.b;

  for (let y = 0; y < H; y++) {
    const ny = y / H;
    // Primary band pattern
    const band  = Math.sin(ny * 22 + noise.noise(ny * 3, 0) * 4) * 0.5 + 0.5;
    // Turbulence
    const turb  = noise.fbm(ny * 8, 0.1, 0, 3, 2, 0.5) * 0.25;
    const value = Math.max(0, Math.min(1, band + turb));
    // Mix two tones of the base color
    const rv = r0 * (0.75 + value * 0.5), gv = g0 * (0.75 + value * 0.4), bv = b0 * (0.8 + value * 0.3);
    ctx.fillStyle = `rgb(${Math.round(rv*255)},${Math.round(gv*255)},${Math.round(bv*255)})`;
    ctx.fillRect(0, y, W, 1);
  }

  // Add a couple of storm ovals
  const stormRng = new SeededRNG(seed);
  const nStorms = stormRng.int(0, 3);
  for (let s = 0; s < nStorms; s++) {
    const sx = stormRng.range(0.15, 0.85) * W;
    const sy = stormRng.range(0.3,  0.75) * H;
    const sw = stormRng.range(20,   60);
    const sh = stormRng.range(8,    20);
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sw);
    const sc = `rgba(${Math.round(r0*255*1.3)},${Math.round(g0*210)},${Math.round(b0*200)},`;
    grad.addColorStop(0, sc + '0.5)');
    grad.addColorStop(1, sc + '0)');
    ctx.save();
    ctx.scale(1, sh / sw);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(sx, sy * (sw / sh), sw, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// Stub kept for compatibility
function _buildGasGiantTexture(c, s) { return c; }

function createAsteroidBelt(rInner, rOuter) {
  // ── Instanced rock meshes — PBR so star light shades them ─
  const rockCount = 2500;
  const rockGeo = new THREE.IcosahedronGeometry(0.04, 1);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x7a7768, roughness: 1.0, metalness: 0.0,
  });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rocks.castShadow    = true;
  rocks.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < rockCount; i++) {
    const r     = rInner + Math.random() * (rOuter - rInner);
    const theta = Math.random() * Math.PI * 2;
    const yOff  = (Math.random() - 0.5) * (rOuter - rInner) * 0.25;
    dummy.position.set(r * Math.cos(theta), yOff, r * Math.sin(theta));
    const s = 0.4 + Math.random() * 1.4;
    dummy.scale.set(s, s * (0.6 + Math.random() * 0.8), s * (0.6 + Math.random() * 0.8));
    dummy.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }
  rocks.instanceMatrix.needsUpdate = true;
  scene.add(rocks); systemObjects.push(rocks);

  // Dust cloud — subtle additive haze
  const dustCount = 4000;
  const dustPos   = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const r = rInner + Math.random() * (rOuter - rInner);
    const t = Math.random() * Math.PI * 2;
    dustPos[i * 3]     = r * Math.cos(t) + (Math.random() - 0.5) * 0.4;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 0.18;
    dustPos[i * 3 + 2] = r * Math.sin(t) + (Math.random() - 0.5) * 0.4;
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dMat = new THREE.PointsMaterial({
    color: 0xaa9977, size: 0.022, transparent: true, opacity: 0.22,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(dGeo, dMat);
  scene.add(dust); systemObjects.push(dust);
}

function createOortCloud() {
  const count = 1000;
  const positions = new Float32Array(count*3);
  for (let i=0; i<count; i++) {
    const r = 40 + Math.random()*30;
    const theta = Math.random()*Math.PI*2;
    const phi = Math.random()*Math.PI;
    positions[i*3]   = r*Math.sin(phi)*Math.cos(theta);
    positions[i*3+1] = r*Math.cos(phi)*0.5;
    positions[i*3+2] = r*Math.sin(phi)*Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  const mat = new THREE.PointsMaterial({color:0x445566, size:0.05, transparent:true, opacity:0.3});
  const cloud = new THREE.Points(geo, mat);
  scene.add(cloud);
  systemObjects.push(cloud);
}

// ── PLANET TERRAIN GENERATION ─────────────────────────────
function createPlanetSurface(planet) {
  clearSystemObjects();

  const radius = 3.0;
  // FIX 5: High-segment sphere for smooth terrain
  const geo = new THREE.SphereGeometry(radius, 256, 256);
  const posAttr = geo.attributes.position;
  const noise = new PerlinNoise(planet.noiseSeed);

  // FIX 2: Process ALL vertices — no division, no skip
  const colors = new Float32Array(posAttr.count * 3);
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);

    // FIX 3: Normalize vertex direction to get sphere normal
    const len = Math.sqrt(x*x + y*y + z*z) || 1;
    const nx = x/len, ny = y/len, nz = z/len;

    // FIX 6: Noise uses spherical coordinates (nx,ny,nz) — NOT UV/planar
    const continent = noise.fbm(nx*2,   ny*2,   nz*2,   4, 2,   0.5);
    const mountain  = noise.fbm(nx*8+10, ny*8+10, nz*8+10, 6, 2.2, 0.55);

    let height = 0;
    let isWater = false;

    switch(planet.type.name) {
      case 'Terrestrial':
      case 'Ocean World': {
        const seaLevel = planet.type.name==='Ocean World' ? 0.3 : 0.0;
        if (continent < seaLevel) { height = 0; isWater = true; }
        else { height = (continent - seaLevel) * 0.3 + mountain * 0.15; }
        break;
      }
      case 'Desert World':
        height = Math.abs(noise.fbm(nx*4,ny*4,nz*4,5)) * 0.2 + mountain*0.05;
        break;
      case 'Ice World':
        height = noise.fbm(nx*3,ny*3,nz*3,4)*0.1 + Math.abs(mountain)*0.1;
        break;
      case 'Lava World':
        height = Math.abs(noise.fbm(nx*6,ny*6,nz*6,5,2.5,0.6))*0.4;
        break;
      case 'Barren Moon':
      case 'Rogue': {
        const craterNoise = noise.fbm(nx*5,ny*5,nz*5,3)*0.1;
        height = -Math.pow(Math.abs(noise.noise(nx*10,ny*10,nz*10)),2)*0.2 + craterNoise;
        break;
      }
      default:
        height = noise.fbm(nx*4,ny*4,nz*4,5)*0.2;
    }

    // FIX 1: NEVER push vertices inside the planet — safe height clamp
    const terrainAmplitude = 0.035;
    const rawHeight = height * terrainAmplitude * radius;
    const safeHeight = Math.max(-radius * 0.2, rawHeight);

    // FIX 3: Displace along sphere normal so shape stays spherical
    const disp = radius + safeHeight;
    posAttr.setXYZ(i, nx*disp, ny*disp, nz*disp);

    // Color mapping
    let r, g, b;
    switch(planet.type.name) {
      case 'Terrestrial':
        if(isWater){[r,g,b]=[0.05,0.2+height*0.1,0.6+height*0.2];}
        else if(height<0.05){[r,g,b]=[0.85,0.82,0.6];}
        else if(height<0.1){[r,g,b]=[0.2,0.5,0.15];}
        else if(height<0.2){[r,g,b]=[0.15,0.4,0.1];}
        else if(height<0.3){[r,g,b]=[0.5,0.45,0.35];}
        else{[r,g,b]=[0.9,0.9,0.95];}
        break;
      case 'Ocean World':
        if(isWater){const d=0.3+height*0.7; [r,g,b]=[0,0.1*d,0.5+d*0.3];}
        else{[r,g,b]=[0.7,0.8,0.9];}
        break;
      case 'Desert World': {
        const dh=(height+0.1)/0.5;
        r=0.7+dh*0.2; g=0.4+dh*0.2; b=0.1+dh*0.1;
        break;
      }
      case 'Ice World':
        r=0.8+height*0.2; g=0.85+height*0.15; b=0.95;
        break;
      case 'Lava World':
        if(height>0.2){[r,g,b]=[0.9,0.4+height,0.0];}
        else{[r,g,b]=[0.15,0.05,0.05];}
        break;
      case 'Gas Giant': {
        const band=Math.sin(ny*20+noise.noise(nx*3,ny*3,nz*3)*3);
        r=0.7+band*0.3; g=0.5+band*0.1; b=0.3;
        break;
      }
      case 'Toxic World':
        r=0.1; g=0.5+height*0.4; b=0.15;
        break;
      case 'Barren Moon': {
        const m=0.2+Math.abs(height)*2;
        r=m; g=m; b=m*1.05;
        break;
      }
      case 'Exotic':
        r=0.5+noise.noise(nx*5,ny*5)*0.5;
        g=0.2+noise.noise(nx*5+1,ny*5+1)*0.3;
        b=0.8+noise.noise(nx*5+2,ny*5+2)*0.2;
        break;
      default: {
        const def=0.3+height*0.5; r=def; g=def; b=def;
      }
    }
    colors[i*3]   = Math.max(0, Math.min(1, r));
    colors[i*3+1] = Math.max(0, Math.min(1, g));
    colors[i*3+2] = Math.max(0, Math.min(1, b));
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  posAttr.needsUpdate = true;
  // FIX 4: Recompute normals after terrain deformation
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  // Explicit generous bounding sphere so THREE never culls the terrain mesh
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0,0,0), radius * 1.5);

  // ── 5. PBR terrain — star PointLight does all illumination ─
  const isOceanP = planet.type.name === 'Ocean World';
  const isIceP   = planet.type.name === 'Ice World';
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness:    isOceanP ? 0.08 : isIceP ? 0.18 : 0.88,
    metalness:    isOceanP ? 0.02 : isIceP ? 0.04 : 0.0,
    side:         THREE.DoubleSide,
  });
  terrainMesh = new THREE.Mesh(geo, mat);
  terrainMesh.frustumCulled = false;
  terrainMesh.castShadow    = false;
  terrainMesh.receiveShadow = false;
  scene.add(terrainMesh);
  systemObjects.push(terrainMesh);

  // ── 6. Atmosphere rim glow (surface view) ───────────────
  if (planet.hasAtmosphere) {
    const atmCols = {
      'Toxic World':  new THREE.Color(0.1, 0.5, 0.1),
      'Lava World':   new THREE.Color(0.7, 0.2, 0.0),
      'Ice World':    new THREE.Color(0.7, 0.9, 1.0),
      'Desert World': new THREE.Color(0.9, 0.6, 0.3),
    };
    const atmColor = atmCols[planet.type.name] || new THREE.Color(0.3, 0.5, 1.0);
    const atmGeo = new THREE.SphereGeometry(radius * 1.055, 64, 64);
    const atmMat = new THREE.ShaderMaterial({
      uniforms: { color: { value: atmColor }, density: { value: planet.atmosphereDensity } },
      vertexShader: `varying vec3 vN; varying vec3 vViewDir;
        void main(){
          vN=normalize(normalMatrix*normal);
          vec4 mvPos=modelViewMatrix*vec4(position,1.0);
          vViewDir=normalize(-mvPos.xyz);
          gl_Position=projectionMatrix*mvPos;
        }`,
      fragmentShader: `
        uniform vec3 color; uniform float density; varying vec3 vN; varying vec3 vViewDir;
        void main(){
          float rim=1.0-abs(dot(normalize(vN),normalize(vViewDir)));
          float a=pow(rim,3.0)*min(1.0,density*0.5)*0.6;
          gl_FragColor=vec4(color,a);
        }`,
      transparent: true, side: THREE.FrontSide,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const atm = new THREE.Mesh(atmGeo, atmMat);
    atm.castShadow = atm.receiveShadow = false;
    scene.add(atm);
    systemObjects.push(atm);
  }

  // Cloud layer
  if (planet.hasAtmosphere && planet.atmosphereDensity > 0.3) {
    createClouds(radius);
  }

  // ── LIGHTING: two lights from opposite sides + strong ambient ──
  // This ensures the ENTIRE sphere is visible regardless of camera angle.
  // Primary star light (key light)
  const surfStarColor = selectedSystem
    ? new THREE.Color(STAR_TYPES[selectedSystem.typeKey]?.color || 0xfff8ee)
    : new THREE.Color(0xfff8ee);
  const keyIntensity = selectedSystem ? Math.min(2.0, (selectedSystem.lightIntensity ?? 2) * 0.4) : 1.0;

  const keyLight = new THREE.DirectionalLight(surfStarColor, keyIntensity);
  keyLight.position.set(80, 25, 0);
  keyLight.castShadow = false;
  scene.add(keyLight);
  systemObjects.push(keyLight);

  // Fill light from opposite side — same color, lower intensity
  // Ensures the "night side" still shows terrain detail
  const fillLight = new THREE.DirectionalLight(surfStarColor, keyIntensity * 0.4);
  fillLight.position.set(-80, -15, -30);
  fillLight.castShadow = false;
  scene.add(fillLight);
  systemObjects.push(fillLight);

  // Strong white ambient so no face is ever completely black
  const ambLight = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambLight);
  systemObjects.push(ambLight);
}

function createClouds(radius) {
  // Use MeshStandardMaterial so the star PointLight illuminates the cloud
  // layer correctly — day side bright, night side dark, no custom lighting.
  const cloudGeo = new THREE.SphereGeometry(radius * 1.022, 64, 64);
  const cloudMat = new THREE.MeshStandardMaterial({
    color:     new THREE.Color(1.0, 1.0, 1.0),
    roughness: 0.85,
    metalness: 0.0,
    transparent:  true,
    opacity:      0.55,
    depthWrite:   false,
    side:         THREE.DoubleSide,
    // Alphamap is procedurally generated on a canvas
    alphaMap: _buildCloudAlphaTexture(),
  });
  const clouds = new THREE.Mesh(cloudGeo, cloudMat);
  clouds.castShadow    = false;
  clouds.receiveShadow = false;
  // Slow drift rotation stored in userData for animation loop
  clouds.userData.cloudDrift = 0.00018 + Math.random() * 0.00012;
  scene.add(clouds);
  systemObjects.push(clouds);
}

function _buildCloudAlphaTexture() {
  // CPU-generated cloud noise on a 256×256 canvas → DataTexture
  const size = 256;
  const data = new Uint8Array(size * size);
  const noise = new PerlinNoise(0xC10ADEE);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 4.0, ny = y / size * 4.0;
      const n = noise.fbm(nx, ny, 0, 5, 2.0, 0.5);
      const v = Math.max(0, Math.min(1, (n + 0.25) * 1.8));
      data[y * size + x] = v > 0.48 ? Math.round(v * 255) : 0;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RedFormat);
  tex.needsUpdate = true;
  return tex;
}

function clearSystemObjects() {
  for (const obj of systemObjects) {
    scene.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m=>m.dispose());
      else obj.material.dispose();
    }
  }
  systemObjects = [];
  planetObjects = [];
  orbitLines = [];
  terrainMesh = null;
  sunMesh = null;
}

// ── SPACE STARFIELD (background) ─────────────────────────
function createBackgroundStars() {
  const count = 5000;
  const positions = new Float32Array(count*3);
  for (let i=0; i<count; i++) {
    const r = 5000 + Math.random()*1000;
    const theta = Math.random()*Math.PI*2;
    const phi = Math.random()*Math.PI;
    positions[i*3]   = r*Math.sin(phi)*Math.cos(theta);
    positions[i*3+1] = r*Math.cos(phi);
    positions[i*3+2] = r*Math.sin(phi)*Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  const mat = new THREE.PointsMaterial({color:0xffffff, size:2, transparent:true, opacity:0.6, sizeAttenuation:false});
  const bg = new THREE.Points(geo, mat);
  scene.add(bg);
  return bg;
}
const bgStars = createBackgroundStars();

// ── MINIMAP ───────────────────────────────────────────────
const minimapCtx = document.getElementById('minimap-canvas').getContext('2d');
function drawMinimap() {
  minimapCtx.fillStyle='rgba(0,0,0,0.85)';
  minimapCtx.fillRect(0,0,120,120);
  // Border
  minimapCtx.strokeStyle='rgba(0,255,157,0.15)';
  minimapCtx.beginPath(); minimapCtx.arc(60,60,58,0,Math.PI*2); minimapCtx.stroke();

  if (currentState === STATE.GALAXY || currentState === STATE.SECTOR) {
    // Draw galaxy spiral
    for (let i=0; i<3000; i++) {
      const rng = new SeededRNG(i*7919);
      const r = Math.pow(rng.next(),0.5)*52;
      const theta = rng.next()*Math.PI*2;
      const d = gen.densityAt(r,theta);
      if (rng.next()>d/5) continue;
      const x = 60+r*Math.cos(theta)*1.1;
      const y = 60+r*Math.sin(theta)*1.1;
      const st = STAR_TYPES[gen.sampleStarType(rng)];
      const c = new THREE.Color(st.color);
      minimapCtx.fillStyle=`rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},0.6)`;
      minimapCtx.fillRect(x,y,1,1);
    }
    // Camera dot
    minimapCtx.fillStyle='#00ff9d';
    minimapCtx.beginPath();
    minimapCtx.arc(60,60,2,0,Math.PI*2);
    minimapCtx.fill();
  } else if (currentState === STATE.SYSTEM || currentState === STATE.ORBIT) {
    // Show planetary orbits with AU scale
    if (selectedSystem) {
      const maxAU = Math.max(...selectedSystem.planets.map(p=>p.orbitAU), 1);
      const scale = 50 / maxAU;
      selectedSystem.planets.forEach((p,i)=>{
        const r = p.orbitAU * scale;
        // Habitable zone tint
        const isHZ = p.orbitAU >= selectedSystem.habZoneInner && p.orbitAU <= selectedSystem.habZoneOuter;
        minimapCtx.strokeStyle = isHZ ? 'rgba(0,255,100,0.35)' : 'rgba(0,207,255,0.18)';
        minimapCtx.beginPath();
        minimapCtx.arc(60,60,r,0,Math.PI*2);
        minimapCtx.stroke();
        // Planet dot
        if (planetObjects[i]) {
          const pm = planetObjects[i];
          const px = 60 + pm.position.x * scale * (10/p.orbitAU) * p.orbitAU / maxAU * 50;
          const pz = 60 + pm.position.z * scale * (10/p.orbitAU) * p.orbitAU / maxAU * 50;
          const pc = new THREE.Color(p.color);
          minimapCtx.fillStyle = `rgb(${Math.round(pc.r*255)},${Math.round(pc.g*255)},${Math.round(pc.b*255)})`;
          const dotR = Math.max(1, p.radiusEarth * 0.3);
          minimapCtx.beginPath();
          minimapCtx.arc(px, pz, dotR, 0, Math.PI*2);
          minimapCtx.fill();
        }
      });
      // Habitable zone label
      minimapCtx.fillStyle='rgba(0,255,100,0.4)';
      minimapCtx.font='6px "Share Tech Mono"';
      minimapCtx.fillText('HZ',2,8);
    }
    // Star at center
    const sc = new THREE.Color(selectedSystem?.color || 0xffff88);
    minimapCtx.fillStyle=`rgb(${Math.round(sc.r*255)},${Math.round(sc.g*255)},${Math.round(sc.b*255)})`;
    minimapCtx.beginPath(); minimapCtx.arc(60,60,3,0,Math.PI*2); minimapCtx.fill();
  } else {
    // Surface: show hemisphere
    minimapCtx.fillStyle='rgba(0,207,255,0.15)';
    minimapCtx.beginPath(); minimapCtx.arc(60,60,50,0,Math.PI*2); minimapCtx.fill();
    minimapCtx.fillStyle='rgba(0,255,157,0.7)';
    minimapCtx.beginPath(); minimapCtx.arc(60,60,3,0,Math.PI*2); minimapCtx.fill();
    minimapCtx.fillStyle='rgba(0,207,255,0.5)';
    minimapCtx.font='6px "Share Tech Mono"';
    minimapCtx.fillText('SURFACE',32,115);
  }
}

// ── GALAXY MAP MODAL ──────────────────────────────────────
function openGalaxyMap() {
  document.getElementById('galaxy-map').classList.add('open');
  drawGalaxyMapCanvas();
}
function closeGalaxyMap() {
  document.getElementById('galaxy-map').classList.remove('open');
}
function drawGalaxyMapCanvas() {
  const c = document.getElementById('galaxy-map-canvas');
  const ctx = c.getContext('2d');
  ctx.fillStyle='#000007';
  ctx.fillRect(0,0,600,600);

  // Background glow
  const grad = ctx.createRadialGradient(300,300,0,300,300,300);
  grad.addColorStop(0,'rgba(80,40,120,0.3)');
  grad.addColorStop(1,'transparent');
  ctx.fillStyle=grad;
  ctx.fillRect(0,0,600,600);

  // Draw galaxy particles
  for (let i=0; i<8000; i++) {
    const rng = new SeededRNG(i*13331);
    const r = Math.pow(rng.next(),0.5)*52;
    const theta = rng.next()*Math.PI*2;
    const d = gen.densityAt(r,theta);
    if (rng.next()>d/5+0.05) continue;

    const px = 300 + r*Math.cos(theta)*5.5;
    const py = 300 + r*Math.sin(theta)*5.5;
    const st = STAR_TYPES[gen.sampleStarType(rng)];
    const col = new THREE.Color(st.color);
    ctx.fillStyle=`rgba(${Math.round(col.r*255)},${Math.round(col.g*255)},${Math.round(col.b*255)},0.8)`;
    ctx.fillRect(px,py,1,1);
  }

  // Nebula overlay
  for (let i=0; i<200; i++) {
    const rng = new SeededRNG(i*99991+1);
    const r = rng.range(3,45);
    const theta = rng.next()*Math.PI*2;
    const d = gen.densityAt(r,theta);
    if (d<1) continue;
    const px = 300 + r*Math.cos(theta)*5.5;
    const py = 300 + r*Math.sin(theta)*5.5;
    const cols = ['rgba(120,40,180,','rgba(40,80,200,','rgba(200,60,40,','rgba(40,160,80,'];
    const c2 = ctx.createRadialGradient(px,py,0,px,py,rng.range(5,20));
    const bc = rng.pick(cols);
    c2.addColorStop(0,bc+'0.15)');
    c2.addColorStop(1,bc+'0)');
    ctx.fillStyle=c2;
    ctx.beginPath(); ctx.arc(px,py,rng.range(5,20),0,Math.PI*2); ctx.fill();
  }

  // Galactic core
  const coreGrad = ctx.createRadialGradient(300,300,0,300,300,40);
  coreGrad.addColorStop(0,'rgba(255,220,150,0.6)');
  coreGrad.addColorStop(0.4,'rgba(255,150,80,0.2)');
  coreGrad.addColorStop(1,'transparent');
  ctx.fillStyle=coreGrad;
  ctx.fillRect(0,0,600,600);

  // Labels
  ctx.font='9px "Share Tech Mono"';
  ctx.fillStyle='rgba(0,255,157,0.5)';
  ctx.fillText('GALACTIC CORE',285,285);
  ctx.fillText('SOL REGION (approx)',360,280);

  // Sol marker
  ctx.strokeStyle='rgba(0,255,157,0.8)';
  ctx.beginPath();
  ctx.arc(355,272,4,0,Math.PI*2);
  ctx.stroke();

  // Outer ring
  ctx.strokeStyle='rgba(0,255,157,0.1)';
  ctx.beginPath(); ctx.arc(300,300,285,0,Math.PI*2); ctx.stroke();

  ctx.fillStyle='rgba(0,207,255,0.4)';
  ctx.font='8px "Share Tech Mono"';
  ctx.fillText('MILKY WAY — 100,000 LY DIAMETER',180,580);
}

// ── TRANSITION: ENTER SYSTEM ──────────────────────────────
function enterSystemFromGalaxy(systemData) {
  selectedSystem = systemData;
  currentState   = STATE.SYSTEM;

  showNotification('ENTERING\n' + systemData.name);

  setTimeout(() => {
    if (galaxyParticles) galaxyParticles.visible = false;
    if (nebulaParticles) nebulaParticles.visible = false;
    if (coreGlow)        coreGlow.visible = false;
    bgStars.visible = true;

    _clearStarHighlight();
    clearSystemObjects();
    createStarSystem(systemData);

    // Camera orbits the star — sunMesh is always at origin after createStarSystem
    const starPos = sunMesh ? sunMesh.position.clone() : new THREE.Vector3(0, 0, 0);
    setSceneCamera(starPos, 20, 2, 200);

    updateHUD();
    updateScaleIndicator();
  }, 800);
}

// ── ENTER PLANET ORBIT ────────────────────────────────────
function enterPlanet(index) {
  if (!selectedSystem || !selectedSystem.planets.length) return;
  if (!planetObjects.length) return;

  currentPlanetIndex = index % planetObjects.length;
  const planet = selectedSystem.planets[currentPlanetIndex];
  const pMesh  = planetObjects[currentPlanetIndex];
  const pRadius = Math.max(0.12, planet.radiusEarth * 0.18);

  currentState = STATE.ORBIT;
  showNotification('ORBITING\n' + planet.name);

  // minDistance must be outside planet surface to prevent clipping
  const minDist = pRadius * 2.5;
  const viewDist = pRadius * 8;
  cameraTarget.copy(pMesh.position);
  setSceneCamera(cameraTarget, viewDist, minDist, viewDist * 10);
  updateHUD();
  updateScaleIndicator();
}

// ── LAND ON PLANET SURFACE ────────────────────────────────
function landOnPlanet() {
  if (!selectedSystem || !selectedSystem.planets.length) return;

  const planet = selectedSystem.planets[currentPlanetIndex % selectedSystem.planets.length];
  showNotification('LANDING ON\n' + planet.name);
  currentState = STATE.SURFACE;

  // Immediately zero the target so the ORBIT tracker (which checks
  // currentState) stops moving it before the surface loads.
  controls.target.set(0, 0, 0);
  cameraTarget.set(0, 0, 0);

  setTimeout(() => {
    clearSystemObjects();
    createPlanetSurface(planet);

    // Reset surface spherical camera to look straight at planet
    _surfTheta = 0;
    _surfPhi = Math.PI / 2;
    _surfRadius = 14;
    _surfThetaDelta = 0;
    _surfPhiDelta = 0;
    _surfScaleDelta = 1;

    _resizeRenderer();
    updateHUD();
    updateScaleIndicator();
  }, 600);
}

// ── ENTER BUTTON ROUTER ────────────────────────────────────
// Called by the single [ ENTER / LAND ] button.
// Routes to the correct action for the current scale level.
function handleEnterBtn() {
  if (currentState === STATE.SYSTEM) {
    enterPlanet(0);
  } else if (currentState === STATE.ORBIT) {
    landOnPlanet();
  }
}

// ── WARP EFFECT ───────────────────────────────────────────
function playWarpEffect(cb, delay=1200) {
  const warpEl = document.getElementById('warp-overlay');
  warpEl.classList.add('active');
  setTimeout(() => {
    warpEl.classList.remove('active');
    if (cb) cb();
  }, delay);
}

// ── WARP TO SELECTED STAR ─────────────────────────────────
function warpToSelectedStar() {
  if (!selectedStar) {
    showNotification('NO STAR\nTARGETED');
    return;
  }

  const system = gen.generateStarSystem(
    selectedStar.sectorX,
    selectedStar.sectorZ,
    selectedStar.starIndex,
    selectedStar.isRealStar ? selectedStar.realData : null
  );

  showNotification('WARP JUMP\nTO ' + system.name);

  playWarpEffect(() => {
    if (galaxyParticles) galaxyParticles.visible = false;
    if (nebulaParticles) nebulaParticles.visible = false;
    if (coreGlow)        coreGlow.visible = false;
    bgStars.visible = true;

    _clearStarHighlight();
    clearSystemObjects();
    createStarSystem(system);

    selectedSystem = system;
    currentState   = STATE.SYSTEM;
    selectedStar   = null;
    selectedStarLocked = false;

    // Camera orbits the star — sunMesh sits at origin after createStarSystem
    const starPos = sunMesh ? sunMesh.position.clone() : new THREE.Vector3(0, 0, 0);
    setSceneCamera(starPos, 20, 2, 200);

    updateHUD();
    updateScaleIndicator();

    _starInfoPane.classList.remove('visible');
    _targetRing.classList.remove('locked');
  }, 1200);
}

function warpToNearestStar() { warpToSelectedStar(); } // legacy alias

function zoomOut() {
  if (currentState === STATE.SURFACE) {
    // SURFACE → ORBIT: rebuild the star system then focus the planet we just left
    currentState = STATE.ORBIT;
    clearSystemObjects();
    if (selectedSystem) createStarSystem(selectedSystem);

    // planetObjects is freshly populated by createStarSystem — read it now
    const safeIdx = currentPlanetIndex % Math.max(1, planetObjects.length);
    const pMesh   = planetObjects[safeIdx];
    if (pMesh) {
      cameraTarget.copy(pMesh.position);
      setSceneCamera(cameraTarget, 3, 0.5, 20);
    } else {
      // Fallback: no planets — go back to star
      const starPos = sunMesh ? sunMesh.position.clone() : new THREE.Vector3(0, 0, 0);
      cameraTarget.copy(starPos);
      setSceneCamera(cameraTarget, 20, 2, 200);
      currentState = STATE.SYSTEM;
    }
    updateHUD();
    updateScaleIndicator();

  } else if (currentState === STATE.ORBIT) {
    // ORBIT → SYSTEM: focus the star
    currentState = STATE.SYSTEM;
    const starPos = sunMesh ? sunMesh.position.clone() : new THREE.Vector3(0, 0, 0);
    cameraTarget.copy(starPos);
    setSceneCamera(cameraTarget, 20, 2, 200);
    updateHUD();
    updateScaleIndicator();

  } else if (currentState === STATE.SYSTEM) {
    // SYSTEM → GALAXY
    currentState   = STATE.GALAXY;
    clearSystemObjects();
    selectedSystem = null;
    selectedStar   = null;
    if (galaxyParticles) galaxyParticles.visible = true;
    if (nebulaParticles) nebulaParticles.visible = true;
    if (coreGlow)        coreGlow.visible = true;
    cameraTarget.set(0, 0, 0);
    setSceneCamera(cameraTarget, 120, 5, 300);
    _targetRing.classList.remove('locked');
    _starInfoPane.classList.remove('visible');
    updateHUD();
    updateScaleIndicator();
  }
}

// ── HUD UPDATES ───────────────────────────────────────────
function updateHUD() {
  const scaleNames = { galaxy:'GALAXY', sector:'SECTOR', system:'SYSTEM', orbit:'ORBIT', surface:'SURFACE' };
  document.getElementById('scale-level').textContent = scaleNames[currentState];

  // Warp only shown in galaxy when a star is targeted
  document.getElementById('warp-btn').style.display =
    (currentState === STATE.GALAXY && selectedStar) ? 'block' : 'none';

  // Action button: visible in SYSTEM and ORBIT; label changes per state
  const landBtn = document.getElementById('land-btn');
  landBtn.style.display =
    (currentState === STATE.SYSTEM || currentState === STATE.ORBIT) ? 'block' : 'none';
  if (currentState === STATE.SYSTEM) landBtn.textContent = '[ ENTER PLANET ]';
  if (currentState === STATE.ORBIT)  landBtn.textContent = '[ LAND ON SURFACE ]';

  // Zoom Out shown in every non-galaxy state
  document.getElementById('back-btn').style.display =
    currentState !== STATE.GALAXY ? 'block' : 'none';

  if (currentState !== STATE.GALAXY && selectedSystem) {
    document.getElementById('sys-name').textContent     = selectedSystem.name + (selectedSystem.isRealStar ? ' ★' : '');
    document.getElementById('sys-startype').textContent = selectedSystem.typeName +
      (selectedSystem.temp > 0 ? ' · ' + Math.round(selectedSystem.temp/100)*100 + ' K' : '');
    const habCount = selectedSystem.planets.filter(p => p.hasLife).length;
    document.getElementById('sys-planets').textContent  =
      selectedSystem.numPlanets + ' · HZ: ' + selectedSystem.habZoneInner.toFixed(2) + '–' + selectedSystem.habZoneOuter.toFixed(2) + ' AU';
    // If in orbit, show the current planet's data
    if (currentState === STATE.ORBIT && selectedSystem.planets[currentPlanetIndex]) {
      const curP = selectedSystem.planets[currentPlanetIndex];
      document.getElementById('nearby-name').textContent = curP.name;
      document.getElementById('nearby-type').textContent = curP.type.name.toUpperCase() + ' · ' + curP.orbitAU.toFixed(2) + ' AU';
    }
  } else {
    document.getElementById('sys-name').textContent     = selectedStar ? (selectedStar.system?.name || 'OBSERVING GALAXY') : 'OBSERVING GALAXY';
    document.getElementById('sys-startype').textContent = selectedStar ? (selectedStar.system?.typeName || '—') : '—';
    document.getElementById('sys-planets').textContent  = selectedStar ? ((selectedStar.system?.numPlanets || '?') + ' DETECTED') : '—';
  }
}

// Update the star-info side panel from a system data object
function updateStarInfoPanel(system, distLY) {
  document.getElementById('si-name').textContent    = system.name;
  document.getElementById('si-type').textContent    = system.typeName + (system.isRealStar ? ' ★' : '');
  document.getElementById('si-mass').textContent    = system.mass.toFixed(2) + ' M☉';
  document.getElementById('si-temp').textContent    = system.temp > 0 ? Math.round(system.temp).toLocaleString() + ' K' : 'N/A';
  document.getElementById('si-planets').textContent = system.numPlanets;
  const habPlanets = system.planets.filter(p => p.hasLife);
  document.getElementById('si-life').textContent    = habPlanets.length > 0 ? 'DETECTED' : 'NONE';
  // Distance: show in ly if < 1000 ly, otherwise in kly
  const distStr = distLY < 1000 ? distLY.toFixed(1) + ' LY' :
                  distLY < 1e6  ? (distLY/1000).toFixed(2) + ' KLY' :
                                   (distLY/1e6).toFixed(2) + ' MLY';
  document.getElementById('si-dist').textContent    = distStr;
  _starInfoPane.classList.add('visible');
}

function updateScaleIndicator() {
  const indicators = {
    galaxy:  'GALAXY SCALE — LOD: POINT STARS · MILKY WAY OVERVIEW',
    sector:  'SECTOR SCALE — LOD: STAR CLUSTERS · LOCAL NEIGHBORHOOD',
    system:  'STAR SYSTEM SCALE — LOD: FULL PLANETARY SYSTEM · AU UNITS',
    orbit:   'PLANETARY ORBIT — LOD: TERRAIN PREVIEW · MOON SYSTEM VISIBLE',
    surface: 'SURFACE SCALE — LOD: HIGH-RES TERRAIN · PROCEDURAL BIOMES',
  };
  document.getElementById('scale-indicator').textContent = indicators[currentState];
  document.getElementById('scale-level').textContent = currentState.toUpperCase();

  const nodes = ['galaxy','sector','system','orbit','surface'];
  const order = [STATE.GALAXY, STATE.SECTOR, STATE.SYSTEM, STATE.ORBIT, STATE.SURFACE];
  const currentIdx = order.indexOf(currentState);
  nodes.forEach((n,i)=>{
    const el = document.getElementById('sn-'+n);
    if(el) el.classList.toggle('active', i<=currentIdx);
  });
}

let notifTimeout;
function showNotification(text) {
  const el = document.getElementById('notification');
  el.innerHTML = text.replace('\n','<br>');
  el.style.opacity = '1';
  clearTimeout(notifTimeout);
  notifTimeout = setTimeout(()=>{ el.style.opacity='0'; }, 2000);
}

// ── STAR HIGHLIGHT HELPERS ────────────────────────────────
function _clearStarHighlight() {
  if (!galaxyParticles || _prevHighlightIdx < 0) return;
  const sizes = galaxyParticles.geometry.attributes.size;
  sizes.setX(_prevHighlightIdx, _prevHighlightSize);
  sizes.needsUpdate = true;
  _prevHighlightIdx = -1;
}

function _applyStarHighlight(idx) {
  if (!galaxyParticles) return;
  const sizes = galaxyParticles.geometry.attributes.size;
  // Restore previous star first
  if (_prevHighlightIdx >= 0 && _prevHighlightIdx !== idx) {
    sizes.setX(_prevHighlightIdx, _prevHighlightSize);
  }
  if (idx !== _prevHighlightIdx) {
    _prevHighlightSize = sizes.getX(idx);
    _prevHighlightIdx  = idx;
  }
  // Inflate selected star so it's unmistakably visible
  sizes.setX(idx, _prevHighlightSize * 3.5);
  sizes.needsUpdate = true;
}

// ── RETICLE STAR TARGETING (runs every frame in galaxy view) ─
function updateReticleTargeting() {
  if (currentState !== STATE.GALAXY || !galaxyParticles) {
    if (_starInfoPane.classList.contains('visible')) {
      _starInfoPane.classList.remove('visible');
      _targetRing.classList.remove('locked');
      _clearStarHighlight();
      selectedStar = null;
      selectedStarLocked = false;
    }
    return;
  }

  // If a star was explicitly selected (search/tap), keep it locked —
  // just keep the UI showing and don't let the raycaster override it.
  if (selectedStarLocked && selectedStar) {
    _targetRing.classList.add('locked');
    _warpBtn.style.display = 'block';
    return;
  }

  // Scale pick threshold with distance so stars are always hittable on mobile
  raycaster.params.Points.threshold = Math.max(1.5, camDist * 0.04);
  raycaster.setFromCamera(_screenCenter, camera);
  const hits = raycaster.intersectObject(galaxyParticles);

  if (hits.length > 0) {
    const hit   = hits[0];
    const idx   = hit.index;
    const pos   = hit.point.clone();
    const sectorX   = Math.round(pos.x / 5);
    const sectorZ   = Math.round(pos.z / 5);
    const starIndex = idx % 16;

    const sameTarget = selectedStar &&
                       selectedStar.index === idx &&
                       selectedStar.sectorX === sectorX &&
                       selectedStar.sectorZ === sectorZ;

    if (!sameTarget) {
      const dbEntry     = galaxyStarDB[idx];
      const realOverride = dbEntry?.isRealStar ? dbEntry.realData : null;
      const system      = gen.generateStarSystem(sectorX, sectorZ, starIndex, realOverride);
      const distLY      = pos.distanceTo(camera.position) * 1000;
      selectedStar = { index: idx, position: pos, sectorX, sectorZ, starIndex, system,
                       isRealStar: dbEntry?.isRealStar || false,
                       realData:   dbEntry?.realData   || null };
      _applyStarHighlight(idx);
      updateStarInfoPanel(system, distLY);
      document.getElementById('nearby-name').textContent = system.name;
      document.getElementById('nearby-type').textContent = system.typeName.toUpperCase();
    }
    _targetRing.classList.add('locked');
    _warpBtn.style.display = 'block';

  } else {
    // Nothing under reticle — only clear if not locked
    if (selectedStar && !selectedStarLocked) {
      _clearStarHighlight();
      selectedStar = null;
      _targetRing.classList.remove('locked');
      _starInfoPane.classList.remove('visible');
      _warpBtn.style.display = 'none';
      document.getElementById('nearby-name').textContent = '—';
      document.getElementById('nearby-type').textContent = '—';
    }
  }
}

// ── KEYBOARD CONTROLS ─────────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.key === 'm' || e.key === 'M') { openGalaxyMap(); return; }
  if (e.key === 'Escape') { closeGalaxyMap(); zoomOut(); return; }

  if (e.key === 'f' || e.key === 'F') {
    if (currentState === STATE.GALAXY)  warpToSelectedStar();
    else if (currentState === STATE.SYSTEM) {
      // Auto-enter the first planet
      if (planetObjects.length > 0) enterPlanet(0);
    }
    else if (currentState === STATE.ORBIT)  landOnPlanet();
    return;
  }

  // W / S — dolly in / out
  if (e.key === 'w' || e.key === 'W') {
    const dir  = controls.target.clone().sub(camera.position).normalize();
    const step = camera.position.distanceTo(controls.target) * 0.08;
    camera.position.addScaledVector(dir, step);
    controls.update();
  }
  if (e.key === 's' || e.key === 'S') {
    const dir  = camera.position.clone().sub(controls.target).normalize();
    const step = camera.position.distanceTo(controls.target) * 0.08;
    camera.position.addScaledVector(dir, step);
    controls.update();
  }

  // Arrow keys — cycle planets while in ORBIT or SURFACE
  if (e.key === 'ArrowRight') {
    currentPlanetIndex++;
    if (currentState === STATE.ORBIT)   enterPlanet(currentPlanetIndex % Math.max(1, planetObjects.length));
    if (currentState === STATE.SURFACE) landOnPlanet();
  }
  if (e.key === 'ArrowLeft') {
    currentPlanetIndex = Math.max(0, currentPlanetIndex - 1);
    if (currentState === STATE.ORBIT)   enterPlanet(currentPlanetIndex % Math.max(1, planetObjects.length));
    if (currentState === STATE.SURFACE) landOnPlanet();
  }
});

// Scroll-to-warp: auto-enter when zoomed very close to a targeted galaxy star
const _canvasEl = document.getElementById('canvas');
_canvasEl.addEventListener('wheel', () => {
  camDist = camera.position.distanceTo(controls.target);
  if (currentState === STATE.GALAXY && camDist < 4 && selectedStar) {
    warpToSelectedStar();
  }
}, { passive: true });

// ── PLANET CLICK / TAP SELECTION ─────────────────────────
// Handles both mouse (desktop) and touch (mobile).
const _clickRaycaster = new THREE.Raycaster();
let _mouseMovedSinceDown = false;
let _touchMovedSinceStart = false;
let _touchStartX = 0, _touchStartY = 0;

// ── Mouse (desktop) ──
_canvasEl.addEventListener('mousedown', () => { _mouseMovedSinceDown = false; });
_canvasEl.addEventListener('mousemove', () => { _mouseMovedSinceDown = true; });
_canvasEl.addEventListener('mouseup', e => {
  if (_mouseMovedSinceDown) return;
  _handleTap(e.clientX, e.clientY);
});

// ── Touch (mobile) ──
_canvasEl.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    _touchMovedSinceStart = false;
    _touchStartX = e.touches[0].clientX;
    _touchStartY = e.touches[0].clientY;
  }
}, { passive: true });
_canvasEl.addEventListener('touchmove', e => {
  if (e.touches.length === 1) {
    const dx = e.touches[0].clientX - _touchStartX;
    const dy = e.touches[0].clientY - _touchStartY;
    if (Math.sqrt(dx*dx + dy*dy) > 8) _touchMovedSinceStart = true;
  }
}, { passive: true });
_canvasEl.addEventListener('touchend', e => {
  if (_touchMovedSinceStart) return;          // swipe → ignore
  if (e.changedTouches.length === 1) {
    _handleTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }
}, { passive: true });

function _handleTap(clientX, clientY) {
  // In GALAXY state: try to click-select any star under the tap point
  if (currentState === STATE.GALAXY) {
    const rect = renderer.domElement.getBoundingClientRect();
    const ndcX =  ((clientX - rect.left) / rect.width)  * 2 - 1;
    const ndcY = -((clientY - rect.top)  / rect.height) * 2 + 1;
    const clickRay = new THREE.Raycaster();
    clickRay.params.Points.threshold = Math.max(1.5, camDist * 0.06);
    clickRay.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const hits = clickRay.intersectObject(galaxyParticles);
    if (hits.length > 0) {
      const hit = hits[0];
      const idx = hit.index;
      const pos = hit.point.clone();
      const sectorX   = Math.round(pos.x / 5);
      const sectorZ   = Math.round(pos.z / 5);
      const starIndex = idx % 16;
      const dbEntry   = galaxyStarDB[idx];
      const realOverride = dbEntry?.isRealStar ? dbEntry.realData : null;
      const system    = gen.generateStarSystem(sectorX, sectorZ, starIndex, realOverride);
      const distLY    = pos.distanceTo(camera.position) * 1000;
      selectedStar = { index: idx, position: pos, sectorX, sectorZ, starIndex, system,
                       isRealStar: dbEntry?.isRealStar || false,
                       realData:   dbEntry?.realData   || null };
      selectedStarLocked = true;
      _applyStarHighlight(idx);
      updateStarInfoPanel(system, distLY);
      document.getElementById('nearby-name').textContent = system.name;
      document.getElementById('nearby-type').textContent = system.typeName.toUpperCase();
      _targetRing.classList.add('locked');
      _warpBtn.style.display = 'block';
      showNotification('STAR TARGETED\n' + system.name);
      return;
    }
    // Tapped empty space — warp if already locked, else deselect
    if (selectedStar) {
      warpToSelectedStar();
    }
    return;
  }
  if (currentState === STATE.SYSTEM && planetObjects.length > 0) {
    const rect = renderer.domElement.getBoundingClientRect();
    const ndcX =  ((clientX - rect.left) / rect.width)  * 2 - 1;
    const ndcY = -((clientY - rect.top)  / rect.height) * 2 + 1;
    _clickRaycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const hits = _clickRaycaster.intersectObjects(planetObjects, false);
    if (hits.length > 0) {
      const idx = planetObjects.indexOf(hits[0].object);
      if (idx >= 0) enterPlanet(idx);
    }
  }
}

// ── STAR SEARCH SYSTEM ─────────────────────────────────────

function renderSearchResults(results) {
  const container = document.getElementById('search-results');
  if (!results || results.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = results.map((star) =>
    `<div class="search-item" data-idx="${star.index}" onclick="window.selectStarFromSearch(${star.index})">
      ${star.isRealStar ? '<span style="color:var(--hud-orange)">★ </span>' : ''}${star.name}<span class="search-item-type">${star.typeName || ''}</span>
    </div>`
  ).join('');
}

function selectStarFromSearch(index) {
  const star = galaxyStarDB.find(s => s.index === index);
  if (!star) return;

  // Clear search UI
  document.getElementById('star-search').value = '';
  document.getElementById('search-results').innerHTML = '';

  // Make sure we're at galaxy scale
  if (currentState !== STATE.GALAXY) {
    zoomOut();
    setTimeout(() => _doSelectStarFromSearch(star), 600);
  } else {
    _doSelectStarFromSearch(star);
  }
}

function _doSelectStarFromSearch(star) {
  selectedStar = star;
  selectedStarLocked = true;
  cameraTarget.copy(star.position);
  setSceneCamera(star.position, 10, 1, 100);

  // Populate star info pane
  const sys = gen.generateStarSystem(star.sectorX, star.sectorZ, star.starIndex,
    star.isRealStar ? star.realData : null);
  const tempStr = sys.temp > 0 ? sys.temp.toFixed(0) + ' K' : '—';
  document.getElementById('si-name').textContent  = sys.name;
  document.getElementById('si-type').textContent  = sys.typeName;
  document.getElementById('si-mass').textContent  = sys.mass.toFixed(2) + ' M☉';
  document.getElementById('si-temp').textContent  = tempStr;
  document.getElementById('si-planets').textContent = sys.numPlanets;
  document.getElementById('si-life').textContent  = sys.planets.some(p=>p.hasLife) ? 'DETECTED' : 'NONE';
  document.getElementById('si-dist').textContent  = star.position.length().toFixed(1) + ' kly';
  _starInfoPane.classList.add('visible');
  _targetRing.classList.add('locked');
  _warpBtn.style.display = 'block';

  showNotification('STAR TARGETED\n' + sys.name);
}

// Wire up search input after module is fully loaded
document.getElementById('star-search').addEventListener('input', function() {
  const q = this.value.trim().toLowerCase();
  if (!q) { renderSearchResults([]); return; }
  const results = galaxyStarDB.filter(star =>
    star.name.toLowerCase().includes(q)
  ).slice(0, 8);
  renderSearchResults(results);
});

// Expose to global scope for onclick handlers
window.selectStarFromSearch = selectStarFromSearch;

// Cached reusable axis vector — avoids allocating a new Vector3 every frame
const _yAxis = new THREE.Vector3(0, 1, 0);
let time = 0;
const clock = new THREE.Clock();

// ── SURFACE VIEW CAMERA — independent of OrbitControls ────
// Direct spherical coords around origin so planet is ALWAYS centered.
let _surfTheta = 0, _surfPhi = Math.PI / 2, _surfRadius = 14;
let _surfThetaDelta = 0, _surfPhiDelta = 0, _surfScaleDelta = 1;
let _surfDragActive = false, _surfLastX = 0, _surfLastY = 0;
let _surfPinchDist = 0;

function _initSurfaceInput() {
  const el = renderer.domElement;

  // Mouse
  el.addEventListener('mousedown', e => {
    if (currentState !== STATE.SURFACE) return;
    _surfDragActive = true;
    _surfLastX = e.clientX; _surfLastY = e.clientY;
  });
  window.addEventListener('mousemove', e => {
    if (currentState !== STATE.SURFACE || !_surfDragActive) return;
    _surfThetaDelta -= (e.clientX - _surfLastX) * 0.005;
    _surfPhiDelta   -= (e.clientY - _surfLastY) * 0.005;
    _surfLastX = e.clientX; _surfLastY = e.clientY;
  });
  window.addEventListener('mouseup', () => { _surfDragActive = false; });

  // Touch
  el.addEventListener('touchstart', e => {
    if (currentState !== STATE.SURFACE) return;
    if (e.touches.length === 1) {
      _surfDragActive = true;
      _surfLastX = e.touches[0].clientX;
      _surfLastY = e.touches[0].clientY;
      _surfPinchDist = 0;
    } else if (e.touches.length === 2) {
      _surfDragActive = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      _surfPinchDist = Math.sqrt(dx*dx + dy*dy);
    }
  }, {passive: true});

  el.addEventListener('touchmove', e => {
    if (currentState !== STATE.SURFACE) return;
    e.preventDefault();
    if (e.touches.length === 1 && _surfDragActive) {
      _surfThetaDelta -= (e.touches[0].clientX - _surfLastX) * 0.005;
      _surfPhiDelta   -= (e.touches[0].clientY - _surfLastY) * 0.005;
      _surfLastX = e.touches[0].clientX;
      _surfLastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (_surfPinchDist > 0) {
        _surfScaleDelta *= _surfPinchDist / dist;
      }
      _surfPinchDist = dist;
    }
  }, {passive: false});

  el.addEventListener('touchend', e => {
    if (currentState !== STATE.SURFACE) return;
    if (e.touches.length === 0) _surfDragActive = false;
    else if (e.touches.length === 1) {
      _surfDragActive = true;
      _surfLastX = e.touches[0].clientX;
      _surfLastY = e.touches[0].clientY;
    }
  }, {passive: true});

  // Scroll zoom
  el.addEventListener('wheel', e => {
    if (currentState !== STATE.SURFACE) return;
    _surfScaleDelta *= e.deltaY > 0 ? 1.05 : 0.95;
  }, {passive: true});
}
_initSurfaceInput();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  time += delta;

  // Snapshot viewport size once per frame — window.innerWidth can change
  // mid-frame on Android as browser chrome shows/hides
  const _frameW = window.innerWidth;
  const _frameH = window.innerHeight;

  // Sync renderer size if window was resized
  if (renderer.domElement.width !== _frameW || renderer.domElement.height !== _frameH) {
    renderer.setPixelRatio(1);
    renderer.setSize(_frameW, _frameH);
    _cvs.style.width  = _frameW + 'px';
    _cvs.style.height = _frameH + 'px';
    camera.aspect = _frameW / _frameH;
    camera.updateProjectionMatrix();
  }

  // Set camera near/far based on current state to prevent clipping
  // Fixed per-state values are more stable than dynamic per-frame calculation
  {
    let targetNear, targetFar;
    if (currentState === STATE.SURFACE) {
      targetNear = 0.1;   targetFar = 500;
    } else if (currentState === STATE.ORBIT) {
      targetNear = 0.05;  targetFar = 2000;
    } else if (currentState === STATE.SYSTEM) {
      targetNear = 0.1;   targetFar = 5000;
    } else {
      targetNear = 1.0;   targetFar = 100000;
    }
    if (camera.near !== targetNear || camera.far !== targetFar) {
      camera.near = targetNear;
      camera.far  = targetFar;
      camera.updateProjectionMatrix();
    }
  }

  // ── RETICLE STAR TARGETING ──
  updateReticleTargeting();

  // Galaxy rotation (very slow)
  if (galaxyParticles) {
    galaxyParticles.material.uniforms.time.value = time;
    galaxyParticles.rotation.y = time * 0.005;
    if (nebulaParticles) nebulaParticles.rotation.y = time * 0.005;
    if (coreGlow) { coreGlow.material.uniforms.time.value = time; coreGlow.rotation.y = time*0.01; }
  }

  // Animate planet orbits (Kepler) + axial rotation + moon hierarchy
  if (currentState === STATE.SYSTEM || currentState === STATE.ORBIT) {
    planetObjects.forEach(pMesh => {
      const { orbitScale, orbitSpeed, rotSpeed } = pMesh.userData;

      // ── Orbital translation ───────────────────────────
      pMesh.userData.orbitAngle += orbitSpeed * delta;
      const angle = pMesh.userData.orbitAngle;
      pMesh.position.set(
        orbitScale * Math.cos(angle),
        0,
        orbitScale * Math.sin(angle)
      );

      // ── 8. Axial self-rotation (cached axis — no GC per frame) ─
      if (rotSpeed) pMesh.rotateOnAxis(_yAxis, rotSpeed * delta);

      // Atmosphere shell follows planet exactly
      if (pMesh.userData.atmMesh) {
        pMesh.userData.atmMesh.position.copy(pMesh.position);
        pMesh.userData.atmMesh.rotation.copy(pMesh.rotation);
      }

      // Ring group follows planet
      if (pMesh.userData.ringMesh) {
        pMesh.userData.ringMesh.position.copy(pMesh.position);
      }

      // ── 9. Moon hierarchy — orbit their parent planet ──
      if (pMesh.userData.moons) {
        pMesh.userData.moons.forEach(mMesh => {
          mMesh.userData.moonAngle += mMesh.userData.moonSpeed * delta;
          const ma  = mMesh.userData.moonAngle;
          const mo  = mMesh.userData.moonOrbit;
          const mt  = mMesh.userData.moonTilt;
          // Position relative to planet (world space)
          mMesh.position.set(
            pMesh.position.x + mo * Math.cos(ma),
            pMesh.position.y + mo * Math.sin(ma) * Math.sin(mt),
            pMesh.position.z + mo * Math.sin(ma) * Math.cos(mt)
          );
          // Slow axial rotation (tidally locked feel)
          mMesh.rotation.y += (mMesh.userData.moonRotSpeed || 0.04) * delta;
        });
      }

      // Keep shader time uniform updated for gas giants etc.
      if (pMesh.material.uniforms && pMesh.material.uniforms.time) {
        pMesh.material.uniforms.time.value = time;
      }
    });

    // In ORBIT state, keep controls.target glued to the orbiting planet
    if (currentState === STATE.ORBIT) {
      const pMesh = planetObjects[currentPlanetIndex % Math.max(1, planetObjects.length)];
      if (pMesh) {
        cameraTarget.copy(pMesh.position);
        controls.target.copy(pMesh.position);
      }
    }

    // Star pulse shader
    if (sunMesh && sunMesh.material.uniforms) {
      sunMesh.material.uniforms.time.value = time;
    }
  }

  // Update camera — surface mode uses direct spherical math, other modes use OrbitControls
  if (currentState === STATE.SURFACE) {
    // Apply any pending rotation input directly
    _surfTheta += _surfThetaDelta;
    _surfPhi   += _surfPhiDelta;
    _surfPhi    = Math.max(0.15, Math.min(Math.PI - 0.15, _surfPhi));
    _surfRadius = Math.max(4, Math.min(40, _surfRadius * _surfScaleDelta));
    _surfThetaDelta = 0; _surfPhiDelta = 0; _surfScaleDelta = 1;

    // Always orbit around exact origin — planet never drifts off-center
    const sp = Math.sin(_surfPhi), cp = Math.cos(_surfPhi);
    const st = Math.sin(_surfTheta), ct = Math.cos(_surfTheta);
    camera.position.set(_surfRadius * sp * st, _surfRadius * cp, _surfRadius * sp * ct);
    camera.lookAt(0, 0, 0);
    // Keep aspect ratio locked to current frame dimensions
    const surfAspect = _frameW / _frameH;
    if (Math.abs(camera.aspect - surfAspect) > 0.001) {
      camera.aspect = surfAspect;
      camera.updateProjectionMatrix();
    }
  } else {
    controls.update();
  }

  // Keep camDist in sync
  camDist = camera.position.distanceTo(controls.target);

  // Fix 4: Prevent camera from entering planet surface
  if (terrainMesh) {
    const minDist = 3.2;
    const dist = camera.position.length();
    if (dist < minDist) {
      camera.position.normalize().multiplyScalar(minDist);
    }
  }

  // Surface rotation — delta-time driven for frame-rate independence
  if (terrainMesh) {
    terrainMesh.rotation.y += 0.00025 * delta * 60;
    // Animate cloud layer drift + shader time uniforms
    systemObjects.forEach(obj => {
      if (obj.userData.cloudDrift) {
        obj.rotation.y += obj.userData.cloudDrift * delta * 60;
      }
      if (obj.material && obj.material.uniforms && obj.material.uniforms.time) {
        obj.material.uniforms.time.value = time;
      }
    });
  }

  // Update HUD coordinates with real astronomical units
  const cp = camera.position;
  // Galaxy scale: units are kly
  // System scale: units approximate AU
  if (currentState === STATE.GALAXY || currentState === STATE.SECTOR) {
    document.getElementById('coord-x').textContent = `X: ${(cp.x * 1000).toFixed(0)} LY`;
    document.getElementById('coord-y').textContent = `Y: ${(cp.y * 1000).toFixed(0)} LY`;
    document.getElementById('coord-z').textContent = `Z: ${(cp.z * 1000).toFixed(0)} LY`;
    document.getElementById('nav-speed').textContent = `RANGE: ${(camDist * 1000).toFixed(0)} LY`;
  } else if (currentState === STATE.SYSTEM || currentState === STATE.ORBIT) {
    // scene unit ≈ 1 AU at system scale
    document.getElementById('coord-x').textContent = `X: ${cp.x.toFixed(2)} AU`;
    document.getElementById('coord-y').textContent = `Y: ${cp.y.toFixed(2)} AU`;
    document.getElementById('coord-z').textContent = `Z: ${cp.z.toFixed(2)} AU`;
    document.getElementById('nav-speed').textContent = `DIST: ${camDist.toFixed(2)} AU`;
  } else {
    const surfR = cp.length();
    document.getElementById('coord-x').textContent = `X: ${(cp.x * 6371).toFixed(0)} km`;
    document.getElementById('coord-y').textContent = `Y: ${(cp.y * 6371).toFixed(0)} km`;
    document.getElementById('coord-z').textContent = `Z: ${(cp.z * 6371).toFixed(0)} km`;
    document.getElementById('nav-speed').textContent = `ALT: ${((surfR - 3.0) * 6371).toFixed(0)} km`;
  }

  // Update sector info
  const sectorX = Math.floor(cp.x / 5);
  const sectorZ = Math.floor(cp.z / 5);
  document.getElementById('sector-id').textContent = `SEC: ${sectorX},${sectorZ}`;
  const localDensity = gen.densityAt(Math.sqrt(cp.x*cp.x+cp.z*cp.z), Math.atan2(cp.z,cp.x));
  document.getElementById('star-count').textContent = `DENSITY: ${(localDensity * 100).toFixed(1)}/kly³`;

  // Minimap
  drawMinimap();

  renderer.render(scene, camera);
}

// ── RESIZE ─────────────────────────────────────────────────
window.addEventListener('resize', _resizeRenderer);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', _resizeRenderer);
}

// ── LOADING SEQUENCE ──────────────────────────────────────
async function loadingSequence() {
  const bar = document.getElementById('loading-bar');
  const status = document.getElementById('loading-status');

  // Guard: if THREE didn't load, stop here with a message
  if (typeof THREE === 'undefined') {
    status.textContent = 'ERROR: THREE.js failed to load. Check internet connection.';
    bar.style.background = '#ff2244'; bar.style.width = '100%';
    return;
  }
  if (!THREE.OrbitControls) {
    status.textContent = 'ERROR: OrbitControls failed to load.';
    bar.style.background = '#ff2244'; bar.style.width = '100%';
    return;
  }

  try {
  const steps = [
    [10, 'GENERATING GALAXY SEED...'],
    [20, 'BUILDING SPIRAL ARM STRUCTURE...'],
    [35, 'DISTRIBUTING STELLAR POPULATIONS...'],
    [50, 'GENERATING NEBULA REGIONS...'],
    [60, 'INITIALIZING SECTOR GRID...'],
    [70, 'LOADING PLANET TEMPLATES...'],
    [80, 'CALIBRATING ORBITAL MECHANICS...'],
    [90, 'INITIALIZING RENDER ENGINE...'],
    [100, 'READY'],
  ];

  for (const [pct, msg] of steps) {
    bar.style.width = pct+'%';
    status.textContent = msg;
    await new Promise(r=>setTimeout(r, 200 + Math.random()*200));
  }

  // Create galaxy
  createGalaxy();
  setSceneCamera(new THREE.Vector3(0, 0, 0), 120);
  updateHUD();
  updateScaleIndicator();
  animate();

  // Hide loading
  const loading = document.getElementById('loading');
  loading.style.transition='opacity 1s';
  loading.style.opacity='0';
  setTimeout(()=>loading.style.display='none', 1000);

  showNotification('MILKY WAY\nLOADED');

  } catch(e) {
    status.textContent = 'INIT ERROR: ' + e.message;
    bar.style.background = '#ff2244'; bar.style.width = '100%';
    console.error(e);
  }
}

// Start — wrapped so any crash shows on the loading screen
try {
  _resizeRenderer();
  setTimeout(_resizeRenderer, 300);
  setTimeout(_resizeRenderer, 1000);
  loadingSequence();
} catch(e) {
  var d = document.getElementById('loading-status');
  if (d) d.textContent = 'STARTUP ERROR: ' + e.message;
  var b = document.getElementById('loading-bar');
  if (b) { b.style.background = '#ff2244'; b.style.width = '100%'; }
  console.error(e);
}

// Expose functions needed by HTML onclick attributes
window.STATE              = STATE;
window.openGalaxyMap      = openGalaxyMap;
window.closeGalaxyMap     = closeGalaxyMap;
window.warpToSelectedStar = warpToSelectedStar;
window.warpToNearestStar  = warpToNearestStar;
window.handleEnterBtn     = handleEnterBtn;
window.enterPlanet        = enterPlanet;
window.landOnPlanet       = landOnPlanet;
window.zoomOut            = zoomOut;
window.selectStarFromSearch = selectStarFromSearch;

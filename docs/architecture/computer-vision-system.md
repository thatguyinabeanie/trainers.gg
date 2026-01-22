# Pokemon VGC Computer Vision System 🎮

## Complete Technical Specification & Implementation Guide

---

## 🎯 **Problem Statement**

### **The Cart vs. Showdown Data Gap**

**Pokemon Showdown** (online simulator) generates rich replay files with turn-by-turn data: every move, speed calculations, damage rolls, and battle state changes.

**Nintendo Switch cartridge games** used in official VGC tournaments provide none of this - when a match ends, all that detailed competitive intelligence is lost forever.

### **Current VGC Tournament Limitations**

- **No Battle Replays**: Cart games don't generate Showdown-style replay data
- **Lost Analytics**: Players can't analyze speed ties, damage calculations, or decision patterns
- **Missing Competitive Intelligence**: Turn-by-turn battle state changes are completely lost
- **Limited Verification**: Tournament integrity relies on player self-reporting without detailed logs
- **Equipment Barriers**: Current data extraction methods require expensive capture setups

### **Our Solution: Computer Vision Bridge**

A system that watches cartridge Pokemon battles and extracts the same level of detailed turn-by-turn data that Showdown provides automatically - creating "cart replays" with full battle analytics while enhancing tournament integrity. As a bonus, the system can also automate stream production tasks like timestamping and markers.

**Key Value Propositions**:

- **Competitive Players**: Get Showdown-style replay data from cartridge tournament games
- **Tournament Organizers**: Automated verification and detailed match logs for dispute resolution
- **Analytics Enthusiasts**: Speed tie detection, damage calculations, decision pattern analysis
- **Community**: Democratized access regardless of streaming equipment budget

---

## 🏗️ **System Architecture**

### **Platform Strategy: Progressive Web App → React Native**

**Phase 1: PWA Development**

- **Chrome Extension**: Desktop users with capture cards
- **Progressive Web App**: Mobile users pointing phone cameras at Switch screens
- **Distribution**: Chrome Web Store + PWA hosting
- **Cross-Platform**: Works on Windows, Mac, Linux, iOS, Android

**Phase 2: React Native Migration**

- **Native Mobile App**: iOS and Android applications
- **Enhanced Features**: Direct camera access, better performance
- **Distribution**: App Store and Google Play
- **Benefits**: Better hardware access, improved offline support

### **Technology Stack**

**Phase 1 (PWA)**

- **Frontend**: JavaScript + WebGPU + Canvas API
- **Computer Vision**: OpenCV.js + MediaPipe + ONNX.js
- **OCR**: Tesseract.js for text extraction
- **Translation**: API integration for international Pokemon names/moves
- **Fallback**: WebAssembly/CPU processing when WebGPU unavailable

**Phase 2 (React Native)**

- **Frontend**: React Native + Native Modules
- **Computer Vision**: Native OpenCV + TensorFlow Lite
- **OCR**: Native Tesseract + ML Kit
- **Translation**: Same API integration
- **Performance**: Native GPU acceleration

### **Browser Support Strategy**

- **Primary Targets**: Chrome (113+), Safari (16.4+), Edge (113+)
- **WebGPU Coverage**: ~85-90% of tournament player base
- **Mobile**: iOS Safari (excellent), Chrome Android (device-dependent)
- **Graceful Degradation**: CPU fallbacks for unsupported devices

---

## 📹 **Input & Processing Pipeline**

### **Multi-Input Strategy**

**Capture Cards**: Native video feed for streamers

- Direct OBS integration for highest quality
- Real-time frame processing via Canvas API

**Phone Cameras**: Point at Switch screen (handheld or TV)

- Progressive Web App with camera access
- Automatic screen detection and perspective correction
- Works with varying lighting and viewing angles

**Webcams**: Point at Switch/TV setup

- Chrome extension with webcam access
- Similar perspective correction as phone cameras

### **Video Processing Flow**

1. **Input Capture**: Video stream → Canvas frames
2. **Preprocessing**: Crop, scale, enhance image quality
3. **Computer Vision**: Extract game state and UI elements
4. **OCR Processing**: Extract text from specific regions
5. **Data Validation**: Cross-reference with tournament context
6. **Upload**: Send structured data to Battle Stadium

### **Canvas API Role**

- **Frame Extraction**: Pull individual frames from video streams
- **Region Cropping**: Isolate specific UI areas (trainer cards, team preview, battle UI)
- **Preprocessing**: Scale, filter, and enhance images for better CV accuracy
- **Format Conversion**: Convert video frames to ImageData for processing

---

## 🔒 **Security & Tournament Integrity**

### **Authentication Workflow**

Every recording session must complete this verification sequence:

**Step 1: System Validation**

- Navigate to Switch System Settings → System
- Display firmware version and system information
- **Purpose**: Log hardware state, detect custom firmware (without blocking)

**Step 2: Trainer Identity Verification**

- Open Pokemon game → Trainer Card
- Display trainer name and trainer ID clearly
- **Purpose**: Link gameplay to registered tournament participant

**Step 3: Team Validation**

- Navigate to battle box selection
- Show team name and Pokemon roster
- **Purpose**: Verify team matches tournament registration

**Step 4: Battle Analysis**

- Proceed to team preview and battle
- **Purpose**: Extract turn-by-turn battle data with verified context

### **Competitive Integrity Rules**

- **No Real-Time Advantage**: Zero information displayed during live matches
- **Silent Collection**: All analysis happens in background
- **Post-Match Only**: Data becomes available only after battle completion
- **Tournament Registration**: All extracted data must match pre-registered information

### **Video Storage & Verification**

- **7-Day Retention**: Keep footage for dispute resolution period
- **Cryptographic Logging**: Hash verification of data extraction
- **Audit Trail**: Complete chain from video → extracted data → tournament results
- **Automatic Deletion**: Hard delete after validation window expires

---

## 🌍 **International Support**

### **Multi-Language Challenge**

Pokemon is played globally with localized names and UI text:

- **Pokemon Names**: "Pikachu" vs "ピカチュウ" vs "皮卡丘"
- **Move Names**: "Thunderbolt" vs "10まんボルト" vs "十万伏特"
- **UI Elements**: Menu text, battle messages

### **Translation Pipeline**

**OCR Extraction**:

- Extract text from Pokemon names, moves, trainer names
- Handle multiple character sets (Latin, Japanese, Chinese, Korean)

**Language Detection**:

- Automatically identify text language
- Route to appropriate processing pipeline

**Translation System**:

- **Database Lookup**: Pre-mapped Pokemon/move names across languages
- **API Translation**: Google Translate for unknown text
- **Normalization**: Convert everything to English for tournament database
- **Validation**: Cross-reference with known Pokemon data for accuracy

### **Supported Languages**

- **Primary**: English, Japanese, Chinese (Simplified/Traditional)
- **Secondary**: French, German, Spanish, Korean, Italian
- **Expansion**: Additional languages based on tournament demand

---

## ⚡ **Core Computer Vision Functionality**

### **Turn-by-Turn Battle Analysis**

**Team Preview Extraction**:

- Identify all 6 Pokemon for both players
- Extract trainer names and validate against registration
- Record team selection order (1st, 2nd, 3rd, 4th picks)
- Determine lead Pokemon positioning (left/right)

**Battle State Tracking**:

- **Move Detection**: Identify selected moves each turn
- **Damage Calculation**: Track HP changes and calculate damage
- **Status Effects**: Monitor burn, paralysis, sleep, etc.
- **Stat Changes**: Track boosts/drops to Attack, Defense, Speed, etc.
- **Field Effects**: Trick Room, Tailwind, weather conditions
- **Turn Counting**: Remaining turns for temporary effects

**Advanced Analytics**:

- **Speed Tie Detection**: Analyze move order to determine speed relationships
- **Priority Analysis**: Track Intimidate order, priority move interactions
- **Item Usage**: Detect item activation and consumption
- **Ability Triggers**: Log when abilities activate and their effects

### **Computer Vision Techniques**

**Template Matching**:

- Recognize consistent UI elements (HP bars, move buttons, Pokemon sprites)
- Fast detection of game states (team preview, battle screen, victory screen)

**OCR (Optical Character Recognition)**:

- Extract Pokemon names, move names, trainer names
- Read numerical values (HP, damage, turn counters)
- Handle multiple fonts and UI layouts

**Machine Learning Models**:

- Pokemon species recognition from sprites
- Move animation classification
- Battle state classification

**Image Preprocessing**:

- Perspective correction for phone camera inputs
- Lighting normalization and glare reduction
- Screen boundary detection and cropping
- Frame stabilization for handheld recordings

---

## 🎥 **Stream Integration Features**

### **Automatic Stream Markers**

**Real-Time Markers** (for live streams):

- Game start/end timestamps
- Round progression markers
- Victory/defeat events
- Automatic labeling: "Round 1 Game 2 vs [Opponent Name]"

**API Integration**:

- **Twitch**: Set stream markers via OAuth on behalf of streamer
- **YouTube**: Generate chapter timestamps for uploaded VODs
- **OBS**: Browser source integration for overlay information

### **Post-Production Tools**

**VOD Processing**:

- Analyze uploaded tournament footage
- Generate detailed timestamps for key moments
- Create highlight reels of critical turns
- Export data for strategy analysis videos

**Battle Stadium Integration**:

- Link extracted data to tournament bracket position
- Associate video timestamps with specific games
- Enable scrubbing through battles on tournament website

---

## 🛠️ **Technical Implementation Details**

### **WebGPU Computer Vision Pipeline**

**Compute Shaders**:

- GPU-accelerated image processing
- Real-time frame analysis without CPU bottleneck
- Parallel processing of multiple image regions

**Performance Optimization**:

- Process only changed screen regions
- Skip redundant frames during animations
- Batch processing for efficiency

**Memory Management**:

- Efficient texture handling for video frames
- Garbage collection for processed image data
- Mobile GPU memory constraints consideration

### **Chrome Extension Architecture**

**Manifest V3 Structure**:

- **Service Worker**: Background CV processing
- **Content Scripts**: UI integration with tournament websites
- **Popup Interface**: Settings and configuration
- **Permissions**: Screen capture, camera access, storage

**Data Flow**:

- Capture → Background processing → API upload → Tournament integration
- Real-time feedback without exposing competitive information
- Error handling and retry logic for network issues

### **Progressive Web App Features**

**Mobile Capabilities**:

- Camera access with orientation handling
- Offline processing capability
- Home screen installation
- Push notifications for tournament updates

**Cross-Platform Consistency**:

- Shared CV models between extension and PWA
- Synchronized settings and preferences
- Universal data format for Battle Stadium integration

---

## 📊 **Data Structure & Output**

### **Battle Replay Format**

**Match Metadata**:

```json
{
  "tournament_id": "vgc2025_regional_chicago",
  "round": 3,
  "game": 1,
  "player1": {
    "name": "TrainerAlex",
    "trainer_id": "123456",
    "team_preview": [...]
  },
  "player2": {
    "name": "PokemonMaster",
    "trainer_id": "789012",
    "team_preview": [...]
  }
}
```

**Turn-by-Turn Data**:

```json
{
  "turn": 1,
  "actions": [
    {
      "player": 1,
      "pokemon": "Incineroar",
      "move": "Fake Out",
      "target": "Garchomp",
      "damage": 23,
      "effects": ["flinch"]
    }
  ],
  "field_state": {
    "weather": null,
    "trick_room": 0,
    "tailwind": { "player1": 0, "player2": 3 }
  }
}
```

### **Analytics Output**

**Speed Calculations**:

- Speed tie detection and probability analysis
- Priority move interaction tracking
- Turn order predictions based on observed data

**Damage Analysis**:

- Damage roll calculations and ranges
- Critical hit detection and frequency
- Item/ability damage modifications

**Strategic Insights**:

- Lead Pokemon selection patterns
- Move usage frequency and effectiveness
- Team synergy analysis across multiple games

---

## 🚀 **Development Roadmap**

### **Phase 1: Core Authentication**

**Technical Goals**:

- Implement System Settings detection and logging
- Build trainer card OCR with 95%+ accuracy
- Create team validation against tournament registration
- Basic Chrome extension framework

**Deliverables**:

- Working prototype for trainer verification
- OCR pipeline for English text extraction
- Integration with Battle Stadium user database

### **Phase 2: Battle Analysis Engine**

**Technical Goals**:

- Team preview detection and Pokemon identification
- Basic move detection and turn tracking
- HP monitoring and damage calculation
- Battle state management (field effects, status conditions)

**Deliverables**:

- Real-time battle data extraction
- Turn-by-turn logging system
- Integration with video input sources

### **Phase 3: Advanced Analytics**

**Technical Goals**:

- Speed tie detection algorithm
- Priority interaction analysis
- Advanced OCR for move names and battle text
- Statistical analysis and pattern recognition

**Deliverables**:

- Comprehensive battle replay system
- Speed calculation and verification tools
- Advanced analytics dashboard

### **Phase 4: International Support**

**Technical Goals**:

- Multi-language OCR implementation
- Pokemon/move name translation database
- Localized UI text recognition
- Cross-language validation system

**Deliverables**:

- Support for Japanese, Chinese, and European tournaments
- Comprehensive name translation system
- Multi-region tournament compatibility

### **Phase 5: Stream Integration**

**Technical Goals**:

- Twitch/YouTube API integration
- Automatic marker generation
- VOD processing capabilities
- OBS browser source integration

**Deliverables**:

- Complete stream production toolkit
- Automated content creation features
- Professional tournament broadcast tools

### **Phase 6: Mobile & Accessibility**

**Technical Goals**:

- Progressive Web App development
- Phone camera optimization
- Offline processing capabilities
- Accessibility features for diverse setups

**Deliverables**:

- Universal access regardless of equipment
- Mobile-first user experience
- Comprehensive device compatibility

---

## 📈 **Success Metrics & Validation**

### **Technical Performance**

- **OCR Accuracy**: >95% for trainer names, Pokemon names, move names
- **Battle Detection**: >99% accuracy for game start/end events
- **Processing Speed**: Real-time analysis without stream lag
- **Device Compatibility**: Support for 90%+ of tournament player setups

### **User Experience**

- **Setup Time**: <5 minutes from installation to tournament ready
- **Error Rate**: <1% false positives in battle data extraction
- **Tournament Integration**: Seamless workflow with existing Battle Stadium processes
- **Community Adoption**: Active use in major regional tournaments

### **Data Quality**

- **Replay Completeness**: 100% turn coverage for valid input sources
- **Speed Tie Accuracy**: >95% correct speed relationship detection
- **Damage Calculation**: Within 1 HP of actual game values
- **International Support**: Accurate translation for 8+ languages

---

## 🎮 **Game-Specific Optimizations**

### **Pokemon Scarlet/Violet Focus**

**Initial Target**: Current VGC format for maximum impact

- Consistent UI elements across all battles
- Standardized animation timing and effects
- Known Pokemon movesets and abilities for validation
- Established competitive ruleset for context

**UI Recognition Patterns**:

- Team preview layout and Pokemon positioning
- Battle interface with HP bars and move buttons
- Status condition indicators and field effect displays
- Victory/defeat screens and result confirmation

**Expansion Strategy**:

- Build robust foundation with current generation
- Create modular system for future Pokemon games
- Maintain backward compatibility for historical analysis
- Support for other competitive formats (singles, draft, etc.)

### **VGC Double Battle Specifics**

**Unique Challenges**:

- Track two Pokemon per side simultaneously
- Complex targeting and interaction patterns
- Priority and speed calculations with 4 Pokemon
- Field effects that impact multiple Pokemon

**Advanced Features**:

- Protect/Detect usage patterns
- Redirection move tracking (Follow Me, Rage Powder)
- Multi-target move damage distribution
- Team positioning and switching strategies

---

## 🔮 **Future Expansion Possibilities**

### **Additional Pokemon Formats**

- **VGC Singles**: Adapt system for 1v1 battles
- **Draft Leagues**: Team building and usage tracking
- **ROM Hacks**: Community format support
- **Historical Games**: Retro tournament analysis

### **Enhanced Analytics**

- **Machine Learning**: Predictive modeling for competitive strategies
- **Statistical Analysis**: Meta game trends and usage statistics
- **Team Building**: AI-assisted team composition recommendations
- **Training Tools**: Practice mode with real-time feedback

### **Community Features**

- **Replay Sharing**: Public database of competitive battles
- **Strategy Guides**: Automated analysis of winning strategies
- **Tournament Coverage**: Enhanced broadcast tools for major events
- **Educational Content**: Teaching tools for competitive Pokemon

### **Cross-Game Integration**

- **Pokemon GO**: Integration with GO Battle League
- **Pokemon Unite**: MOBA-style battle analysis
- **Trading Card Game**: Digital tournament support
- **Mobile Games**: Broader Pokemon competitive ecosystem

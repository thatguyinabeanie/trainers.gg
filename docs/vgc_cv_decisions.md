# Pokemon VGC Computer Vision System 🎮

## Automated Tournament Analysis & Stream Integration

---

## 🎯 **Problem Statement**

### **The Cart vs. Showdown Data Gap**

**Pokemon Showdown** (online simulator) generates rich replay files with turn-by-turn data: every move, speed calculations, damage rolls, and battle state changes. **Nintendo Switch cartridge games** used in official VGC tournaments provide none of this - when a match ends, all that detailed competitive intelligence is lost forever.

### **Current VGC Tournament Limitations**

- **No Battle Replays**: Cart games don't generate Showdown-style replay data
- **Lost Analytics**: Players can't analyze speed ties, damage calculations, or decision patterns
- **Missing Competitive Intelligence**: Turn-by-turn battle state changes are completely lost
- **Limited Verification**: Tournament integrity relies on player self-reporting without detailed logs
- **Equipment Barriers**: Current data extraction methods require expensive capture setups

### **Our Solution: Computer Vision Bridge**

A system that watches cartridge Pokemon battles and extracts the same level of detailed turn-by-turn data that Showdown provides automatically - creating "cart replays" with full battle analytics while enhancing tournament integrity. As a bonus, the system can also automate stream production tasks like timestamping and markers.

**Key Value Propositions**:

- **Tournament Organizers**: Automated data collection, dispute resolution, integrity verification
- **Competitive Players**: Detailed analytics, speed tie detection, strategic insights
- **Content Creators**: Automatic stream markers, timestamped VODs, professional production tools
- **Community**: Democratized access regardless of streaming equipment budget

---

## Key Architecture & Implementation Decisions

## 🏗️ **Platform Architecture**

### **Chrome Extension + Progressive Web App**

- **Decision**: Chrome extension for desktop users, PWA for mobile phone users
- **Rationale**: Better than OBS plugin - easier distribution, automatic updates, cross-platform by default
- **Fallback**: WebGPU not available → WebAssembly/CPU processing

### **Technology Stack**

- **Frontend**: JavaScript + WebGPU + Canvas API
- **Computer Vision**: OpenCV.js + MediaPipe + ONNX.js
- **OCR**: Tesseract.js
- **Translation**: API integration for international Pokemon names/moves
- **Deployment**: Chrome Web Store + PWA hosting

---

## 📹 **Input Sources**

### **Multi-Input Strategy**

- **Capture Cards**: Native video feed for streamers
- **Phone Cameras**: Point at Switch screen (handheld or TV)
- **Webcams**: Point at Switch/TV setup
- **Decision**: Support all three to democratize access - no expensive hardware required

### **Video Processing Pipeline**

- **Real-time**: Live tournament matches with immediate upload
- **Post-processing**: YouTube VODs and Twitch recordings
- **Canvas Role**: Bridge between video sources and CV algorithms

---

## 🔒 **Security & Verification**

### **Authentication Workflow** (Required for every session)

1. **System Settings**: Log Switch firmware info (detect custom firmware)
2. **Trainer Card**: Extract trainer name + trainer ID via OCR
3. **Team Selection**: Verify battle box name + Pokemon roster
4. **Team Preview**: Final validation before match analysis begins

### **Competitive Integrity Rules**

- **No Real-Time Advantage**: Zero information displayed to players during matches
- **Silent Data Collection**: All analysis happens in background during live play
- **Tournament Registration**: Trainer name + ID must match pre-registered data

### **Video Storage Strategy**

- **7-Day Retention**: Keep footage for dispute resolution period
- **Automatic Deletion**: Hard delete after validation window expires
- **Cost Management**: Short-term storage only, not long-term archival

---

## 🌍 **International Support**

### **Multi-Language Pipeline**

- **OCR Extraction**: Pull text from Pokemon names, moves, UI elements
- **Language Detection**: Auto-identify Japanese, Chinese, French, Spanish, etc.
- **Translation System**:
  - Database lookup for known Pokemon/move names
  - API translation for unknown text
  - Normalize everything to English for tournament database

### **Regional Considerations**

- **Text Recognition**: Handle different character sets (Latin, Japanese, Chinese)
- **UI Variations**: Account for localized menu layouts
- **Name Mapping**: Comprehensive database of Pokemon/move names across languages

---

## 🎯 **Core Functionality**

### **Turn-by-Turn Logging**

- **Team Preview**: 6 Pokemon + trainer names for both players
- **Battle Actions**: Move selections, Pokemon switches, item usage
- **Game State**: Turn counters (Trick Room, Tailwind), stat boosts, status conditions
- **Speed Analysis**: Detect speed ties through move/ability timing
- **Priority Tracking**: Intimidate order, move priority interactions

### **Stream Integration**

- **Automatic Markers**: Set timestamps for game start/end, rounds
- **Tournament Labeling**: "Round 1 Game 2 vs [Opponent]" descriptions
- **API Integration**: Twitch markers via OAuth, YouTube chapters for VODs

### **Tournament Management**

- **Battle Stadium Integration**: Auto-upload match data with tournament context
- **Opponent Validation**: Cross-check results with opponent confirmation
- **Dispute Resolution**: Manual review system with video evidence

---

## 🚀 **Development Approach**

### **Implementation Priority**

1. **Authentication System**: System settings + trainer card OCR
2. **Team Preview Detection**: Pokemon roster validation
3. **Basic Battle Logging**: Move detection and turn tracking
4. **Stream Integration**: Automatic markers and labeling
5. **International Support**: Translation pipeline
6. **Advanced Analytics**: Speed tie detection, priority analysis

### **Browser Support Strategy**

- **Primary**: Chrome, Safari (excellent WebGPU support)
- **Mobile**: iOS Safari (great), Chrome Android (device-dependent)
- **Coverage**: ~85-90% of target tournament player base
- **Graceful Degradation**: CPU fallbacks for unsupported devices

---

## 📊 **Success Metrics**

### **Technical Goals**

- **Accuracy**: >95% OCR success rate for trainer names/Pokemon
- **Performance**: Real-time processing without stream impact
- **Reliability**: Handle lighting variations, viewing angles, screen glare

### **User Experience Goals**

- **Zero Friction**: Simple setup, automatic operation
- **Universal Access**: Works regardless of streaming setup
- **Tournament Ready**: Seamless integration with existing VGC tournament flow

---

## 🎮 **Game-Specific Optimizations**

### **Pokemon Scarlet/Violet Focus**

- **Decision**: Start with current competitive format only
- **UI Consistency**: Standardized battle interface for reliable detection
- **Expansion Path**: Build foundation for other Pokemon games later

### **VGC Format Specifics**

- **Team Preview**: 6v6 selection down to 4v4 battle teams
- **Double Battles**: Track both Pokemon positions and interactions
- **Tournament Structure**: Best-of-3 matches with bracket progression

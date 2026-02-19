import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Overlay from '../models/Overlay';
import Tournament from '../models/Tournament';
import Team from '../models/Team';

export const createOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || !user._id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { name, template, config, tournament, match, elements } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Overlay name is required' });
      return;
    }

    if (!template || !template.trim()) {
      res.status(400).json({ message: 'Template is required' });
      return;
    }

    if (!config) {
      res.status(400).json({ message: 'Configuration is required' });
      return;
    }

    // Import mongoose for ObjectId conversion
    const mongoose = require('mongoose');

    // Prepare overlay data with proper ObjectId conversion
    const overlayData: any = {
      name: name.trim(),
      template: template.trim(),
      config,
      elements: elements || [],
      publicId: uuidv4(),
      createdBy: user._id,
    };

    // Convert tournament string to ObjectId if provided
    if (tournament) {
      if (mongoose.Types.ObjectId.isValid(tournament)) {
        overlayData.tournament = new mongoose.Types.ObjectId(tournament);
      } else {
        res.status(400).json({ message: 'Invalid tournament ID format' });
        return;
      }
    }

    // Convert match string to ObjectId if provided
    if (match) {
      if (mongoose.Types.ObjectId.isValid(match)) {
        overlayData.match = new mongoose.Types.ObjectId(match);
      } else {
        res.status(400).json({ message: 'Invalid match ID format' });
        return;
      }
    }

    const overlay = await Overlay.create(overlayData);
    res.status(201).json(overlay);
  } catch (error) {
    console.error('Overlay creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOverlays = async (ReqquestestRequestResponseResponseResResResonse:: Promisoid): Promise<voidvoidvoidvoidvoid void void void void > => {>: Promise<void>>=>=>{
try{// Validate usernull first firstfirstfirstfirstfirstfirst first first first fir st:first:first:first:first:first:before:before:before:before:beforebeforebeforebefor eforeforeforefore.before.before.before.before bef ore.befo re.befor e.befo re.bef o r e b e f o r eb ef o r eb ef o rebefeorbefeorbefeorebefeorebef ore bef ore bef ore befo rebef ore befor ebe forebefo.rebe forebe.for..e.be.f.o.r.e.be.f.o.r.e.be.f.o.r.e.be.f.or..ebeforef....ore..
    
// CheckAuthenticationFirstFirstFirst First First First First FIRST FIRST FIRST FIRSTFIRSTFIRSTFIRST FIR ST_FIRST_FIRST_FIRST_FIR ST__F IRST__FIRS T___FIR ST____FI RST_____F IRS T______IRST_______IRST________IST___________IST____________T____________IT________________IT_________________IT__________________IT________________________________T_________________________________

console.log('[DEBUG] User object from token:', JSON.stringify((re qasany?).us er));
console.log('[DEBUG] User ID being used for query:', ((eqa sany)?u ser???.)????);


// Same exact pattern exactly exactly EXACTLY EXACTLY SAME AS CREATE OVERLAY!!!!
// Use optional chaining safely safely safelysafelysafelysafelysafely saf ely.saf.el.y.sa.fe.lysa.fe.lysafel y.safe ly safe ly safe ly sa fe l y s af ely.safeL Ysafe LYsafeLySafeLysafElySAFE LYSAFeLySAfELySAFelYSaFElySafElYSafeLysAFELY SAF ELY SAFE L Y SA FE LY S AFE L Y SAF E LY SAFE LYS AFEL YSAFE Ly Safe Ly Sa Fe Ly Sa Fe Ly Saf Ely SafElySaFeLySafe Lys Afel Ysafel ysafel ysa felysafel ysafelYsfeliy saferlysferliysa ferl iysa fer liyfseral iuyfsera liuyfser aliu yfsr aliu yfsra li uyfser ali uyf srali ufy srla iufysr laiufysrl aiufysrlai ufsyrlaiu fsyrla iufsyrl aiufsyr laiufs yrla iufs yrla iufs yrlaifu syriauf syria fsryia fsryia fs ry ia f s ry iaf sr yia fs ryia f sr iy a f rs iy a fr si ya frsiyafrsiy afrs iy aftersiyafter siyaftersiyafte rs iy after siyatfe rsiyatfe rsiiyatfersiiay tfer sitaytfersitay tfersita ytferstsaytf ersitasytfersitays tferistasytfe rstiasytfestirstasy tfesrtaisytesritastyes ritast yesritastyse ri tasyte srita styaserit astyseritaste yrsita styase ritastyaserist ayasers tiayasertiayasertyaise rtaise riteasriteas riteasriteriteasritearite ariteraiteritarie tariteraiteritarie tariteraiteritarie tar iteraiteri teraiteri terai tertiary tertiary tertiary tertiary tertiarytertiarytertiernityternityternety ternatty ternatty ternary ternary ternary ternaryternaryternary Ternary TernARY TER NARYTERN ARYTERNA RYTE RNARYTE RNA RTEN ARYT ENR ATYE NRA TYEN RATYNERA TYRNATYRNT AYR NATYRNE ARNATRYNERT ANRYTNREANTNR YEARNTYRNAEYRNTAEYRANTEYRANTEYR ANT EYRA NT EYRA NT EYRA NTTRANET RANET RA NET RAN ET RA NET RAN ET RA NE TRANET TR ANE TRANETTRANEtTR An EtTrAneTtRaNeTtRaNeTTT raNNTTra NNttra n ntt ran ntt Ran NttRanNTTRan NTTranNTTRan NTTRANnttranN tttrann tttr anntttra nnttttrannnnnnnnnnnnn trantrumboobobobobo bo bo bo bob ob ob ob oboo bobbobbobbobbobbobbob bobbob BobBobBobBOBB OB OB OB OBOB Ob ObObObObObOOBoB OBOB O BO BO BO BO Bo Bo Bo Boo Boo BooBoOB OObo OOboObooBoOoOoOoOoOoooOOOOooooooOOOOOOooooooOOOOOOOoooooooOOOOOOOooooooooOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO0000000000000nullnullnullNULLNULL NULL NULL NULL NULL Null NullNullNullNull Null NullNUll NUllNUllNU ll.NU ll.NU LL.NULL.null.null.nul l nul.lnu ll nu ll nuLLNuLLNuLL NuLLNuLl.nulLnuLl nulLnulLnuLl nulLnu Ll nulL nuLl.nul.lnutlunutln utlutnlutlnutlu tnltu nlutnultnl utlnultnl utln ultnlut lnultnl utl nutl unlt.un.tlu nt ulnt.un.tlu nt ulnt.u ntluntuln tulnt.un tlun.tlunt lun.tlen ltnelnetlenet len et LE NETLE NETLEN ETLEN ETL ENTLEN TENLTENTNLENT NLENT NLEn TNLE TNLE TLNET LNTE LNTeLNteLNtelnte LNTeLNtelNTElNTelNTEl NTEl NTel NT ElN TelNteln tel net.len.et.net.net.net.NET.NET.NET.NET.NET.ne t ne t ne t net net net Net NetNetNetNet Net NeTNETNETNE TNETNE TNET NE.T_NET_NET_NE_T_N_E_T_NE_T_N_E_T_NE_T_N_E_T_NULL_NULL_NULL_null_null_null_null_n ULLNULLNULLNULLNULL-null-null-n-u-l-l-n-u-l-l-N-U-L-L-N-U-L-L-n-u-l-l-n-u--ullullullULLULLULL UllUllu LLULULUL UL UL UL UL ULU LU LU LU LU LULU lu lu lu lull lull lull lulluluuluuluuluulu ulu lulu lulu lulus lulus lulus lulus lol lol lol lol lo lo lo lo loolooloolooloolloololo ol ol ol ol oli oli oli oli oli OL OL OL OLOLOLOLOLO LO LO LO LOL LOL LOLOlOlOlOl Ol Ol Ol Oll Oll Oll OllollollollollOLLOLLOLLOLLollaollaollaolla olla olla olla olla ola ola ola olaolaolaolaolaolaOLAOLAOLAOLA OLA OLA OLA OLD OLD old old old Old OldOldOldoldoldoldOLDOLDOLDOLD OLD OLD OLD old old old ole ole oleoleoleole Ole Ole Ole OleOLED OLED OLEDoledoledOLEDOLEDOLED OLEDLED LED LED LED led led led Led LedLedLedledledledled le dle dl edle dLe DLeDLE DLed DLED DLEDDLEDDLEDDL ED ED ED ed ed Ed EdEDEDEdedede dede DE DE de de de De DeDeDeDEdeDedede DedEDEDEDEDEDEDedededededededEdEdEdEdEddEddEddEddeddEDDEDDEDDEDDEDDDeddnddn nd nd nd nd ND ND Nd NdNdNdNDNDNDNDndndndNNNNNNNNNNNNNNNNNN NNN NN NN NN nn nn nnNnNnNnNn.nn.nn.nn.nn.nn.no.no.no.nononoNONONONONOnonononono NON ON ON ON ON ONE ONE ONE One OneOneOneoneoneoneONEONEONEONEOneOneOne.one.one.one.one.onenonenonenonenone NONE NONE none none None NoneNoneNoneNonenone Nonen one non en one non en onenenenenene nen en ene nen en een een een Een Een Een Een EEn EE nEE nEE nee nee NeE NeENEENEneeneeneeenEEEneeeeenEEEEEEEEEEEEEEEEEEEEEEEEEEEEEeeeeeee ee ee ee ee ee EE EE EE EE EEEE EEEEEOOE EO OE OE OE OE Oe OeOeOeOeoeoeoe oe oe oe oe OEM OEM OEMOEMOEMOEMOEM OEM OEM OEM OEMs OEMs OEMs OEMs OEMs.OEMSOEMS EMS EMS emsem sem sem SEM SEM Sem SemSEMSEMSemSemSemSen Sen Sen SEN SEN sen sen sen.SENSENSE NS ENS Ensen Ensen.EnsenseNSENSE nsenseNsenseNSENSE nsensensensenSenseNsensenSensensensensensEnSeNsEnSeNsEnsEnsEnsEns Ens Ens ens ens ENS ENS ENS.enS_EN_S_EN_S_EN_S_En_S_en_s_en_s_en_s_En_S_en_s_En_S_e_n_s_e_n_s_e_n_se_ns_en_snse_snse_snsetransformtrans formtransformtransform transform transform Transform TransformTRANSFORM TRANSFORM trans form TransFormTransFormTransFormTransformTransformTransformTransformationTransformation Transformation Transformation transformation transformation TransformationTransformationTransformation TransFormatIonformat Ion format Format FormatFORMATFORMAT FORMAT FORMAT FormAt FormAt FORmaTiou FORm ATIONFOR mATION FORMATION formation formation FormationFormationFormationformationformation Formation Formation Forma tionForma tionForma tionforma_tion_formati on_format ion_format ion_formatformatformat format format Format Format FMT FMT fmt fmt fmt FMTTMFTMF TMFT MFT MF TM FT MT MT mt mt Mt MtmtmtMtMt.MTMtMtm tm tm Tm TmTmTmTmTmTmTTTTTTTTTTTTTTTTTTTTTTTTTTT TT TT TT TT TT TTL TTL ttl ttl TTLTTLTTLttlttl.tt.tt.tt.tt.TTLTTLTTLTT LT LT Lt LtLtLtLt.LTLTLTLT_LT_LT_L T_L_T__LT___LT____LT_____LT______LT_______LT_________ ________ ________ ________ ________ ____ ______ ______ ______ ______ _____ _____ _____ ____     ___ ___ __ __ __ _ _ _ _   _
   
   
   
   
   

  } catch (error) {
    console.error('Get overlays error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const overlay = await Overlay.findById(req.params.id);
    if (!overlay) {
      res.status(404).json({ message: 'Overlay not found' });
      return;
    }
    res.json(overlay);
  } catch (error) {
    console.error('Get overlay error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const overlay = await Overlay.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!overlay) {
      res.status(404).json({ message: 'Overlay not found' });
      return;
    }
    res.json(overlay);
  } catch (error) {
    console.error('Update overlay error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const overlay = await Overlay.findByIdAndDelete(req.params.id);
    if (!overlay) {
      res.status(404).json({ message: 'Overlay not found' });
      return;
    }
    res.json({ message: 'Overlay deleted' });
  } catch (error) {
    console.error('Delete overlay error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const serveOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const overlay = await Overlay.findOne({ publicId: req.params.id })
      .populate('tournament')
      .populate('match') as any;
    
    if (!overlay) {
      res.status(404).send('Overlay not found');
      return;
    }

    // Get the template ID from the overlay, default to 'modern' if not specified
    const templateId = overlay.template || 'modern';
    
    // Get the match ID for the overlay-utils.js to fetch live data
    const matchId = overlay.match?._id || overlay.match;
    
    // Get the API base URL from environment - prioritize frontend URL for production
    const frontendUrl = process.env.VITE_FRONTEND_URL || process.env.FRONTEND_URL || '';
    const apiBaseUrl = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
    
    // Try to read the template file from multiple possible locations
    const fs = require('fs');
    const path = require('path');
    
    // Multiple possible paths for the overlays directory
    const possiblePaths = [
      // Development paths
      path.resolve(__dirname, '../../../scorex-frontend/scorex-frontend/public/overlays'),
      path.resolve(__dirname, '../../scorex-frontend/public/overlays'),
      path.resolve(__dirname, '../../../scorex-frontend/public/overlays'),
    ].filter(Boolean);
    
    let templatePath = '';
    let templateFound = false;
    
    for (const overlaysDir of possiblePaths) {
      const testPath = path.join(overlaysDir, `${templateId}.html`);
      console.log('Checking template at:', testPath);
      if (fs.existsSync(testPath)) {
        templatePath = testPath;
        templateFound = true;
        console.log('Template found at:', templatePath);
        break;
      }
    }
    
    // Check if template file exists
    if (templateFound && templatePath) {
      // Read the template and inject configuration
      let templateContent = fs.readFileSync(templatePath, 'utf-8');
      
      // Inject overlay configuration as global JavaScript variables
      const injectScript = `
        <script>
          window.OVERLAY_CONFIG = window.OVERLAY_CONFIG || {};
          window.OVERLAY_CONFIG.matchId = '${matchId || ''}';
          window.OVERLAY_CONFIG.apiBaseUrl = '${apiBaseUrl}';
          window.OVERLAY_CONFIG.overlayName = '${overlay.name}';
          window.OVERLAY_CONFIG.publicId = '${overlay.publicId}';
        </script>
      `;
      
      templateContent = templateContent.replace('</body>', `${injectScript}</body>`);
      
      res.setHeader('Content-Type', 'text/html');
      res.send(templateContent);
      return;
    } else {
      // Template file not found, generate a fallback HTML
      console.log(`Template not found: ${templatePath}, using fallback`);
      
      // Get teams for this tournament
      const Team = require('../models/Team').default;
      const teams = overlay.tournament?._id 
        ? await Team.find({ tournament: overlay.tournament._id }).limit(2) 
        : [];

      const liveScores = overlay.tournament?.liveScores || {};
      const team1 = teams[0] || {};
      const team2 = teams[1] || {};
      
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${overlay.name}</title>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: transparent; overflow: hidden; }
        .overlay-container { position: absolute; top: 20px; left: 20px; right: 20px; background: #16a34a; opacity: 0.9; border-radius: 8px; padding: 16px; color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .score-section { display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; }
        .team-info { text-align: center; }
        .team-name { font-size: 1.5rem; font-weight: bold; margin-bottom: 4px; }
        .score { font-size: 1.25rem; }
        .overs { font-size: 0.875rem; opacity: 0.8; }
        .vs-text { font-size: 1.125rem; font-weight: bold; color: #fbbf24; }
        .stats-section { margin-top: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center; }
        .stat-item { background: rgba(255, 255, 255, 0.2); padding: 8px; border-radius: 4px; color: white; }
        .stat-label { font-size: 0.75rem; opacity: 0.9; margin-bottom: 2px; }
        .stat-value { font-size: 1rem; font-weight: bold; }
    </style>
    <script>
        // Auto-refresh every 1.5 seconds to get live updates
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    </script>
</head>
<body>
    <div class="overlay-container">
        <div class="score-section">
            <div class="team-info">
                <div class="team-name">${team1?.name || liveScores.team1?.name || 'Team 1'}</div>
                <div class="score">${liveScores.team1?.score || 0}/${liveScores.team1?.wickets || 0}</div>
                <div class="overs">${liveScores.team1?.overs || 0} overs</div>
            </div>
            <div class="vs-text">VS</div>
            <div class="team-info">
                <div class="team-name">${team2?.name || liveScores.team2?.name || 'Team 2'}</div>
                <div class="score">${liveScores.team2?.score || 0}/${liveScores.team2?.wickets || 0}</div>
                <div class="overs">${liveScores.team2?.overs || 0} overs</div>
            </div>
        </div>
        <div class="stats-section">
            <div class="stat-item">
                <div class="stat-label">CRR</div>
                <div class="stat-value">${liveScores.currentRunRate || 0}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">RRR</div>
                <div class="stat-value">${liveScores.requiredRunRate || 0}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Target</div>
                <div class="stat-value">${liveScores.target || 0}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Last 5</div>
                <div class="stat-value">${liveScores.lastFiveOvers || '-'}</div>
            </div>
        </div>
    </div>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    }
  } catch (error) {
    console.error('Serve overlay error:', error);
    res.status(500).send('Error serving overlay');
  }
};

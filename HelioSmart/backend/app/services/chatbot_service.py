"""
Chatbot service with Ollama LLM integration for HelioSmart
Solar energy estimation and consulting AI assistant
"""

import os
import logging
import httpx
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
import re

logger = logging.getLogger(__name__)

# Ollama configuration
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")  # Small, fast model

# Check if Ollama is available
async def check_ollama() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_URL}/api/tags")
            return response.status_code == 200
    except:
        return False

# Try to import torch
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("PyTorch not available")

# Try to import speech components
try:
    from transformers import WhisperProcessor, WhisperForConditionalGeneration
    import soundfile as sf
    from pydub import AudioSegment
    SPEECH_AVAILABLE = True
except ImportError:
    SPEECH_AVAILABLE = False
    logger.warning("Speech components not available")

try:
    from gtts import gTTS
    TTS_AVAILABLE = True
except ImportError:
    TTS_AVAILABLE = False
    logger.warning("gTTS not available")

try:
    from langchain_community.vectorstores import FAISS
    try:
        from langchain_huggingface import HuggingFaceEmbeddings
    except ImportError:
        from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False
    logger.warning("RAG components not available")


class ChatbotService:
    """Chatbot service with Ollama LLM, STT, TTS, and RAG support for HelioSmart"""
    
    def __init__(self):
        if TORCH_AVAILABLE:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = "cpu"
        logger.info(f"Chatbot running on device: {self.device}")
        
        self.ollama_available = False
        self.ollama_model = OLLAMA_MODEL
        self.whisper_model = None
        self.whisper_processor = None
        self.vector_store = None
        self.embeddings = None
        self.text_splitter = None
        
        # Paths
        self.audio_path = "audio"
        self.vector_db_path = "faiss_index"
        self.documents_dir = "documents"
        
        # Ensure directories exist
        for path in [self.audio_path, self.documents_dir]:
            os.makedirs(path, exist_ok=True)
        
        # Initialize components
        self._initialize_llm()
        self._initialize_rag()
        self._initialize_speech()
    
    def _initialize_llm(self):
        """Initialize Ollama LLM connection"""
        try:
            # Test Ollama connection synchronously
            import httpx
            with httpx.Client(timeout=5.0) as client:
                response = client.get(f"{OLLAMA_URL}/api/tags")
                if response.status_code == 200:
                    self.ollama_available = True
                    models = response.json().get("models", [])
                    model_names = [m.get("name", "") for m in models]
                    logger.info(f"Ollama connected. Available models: {model_names}")
                    
                    # Check if our model is available
                    if not any(OLLAMA_MODEL in name for name in model_names):
                        logger.warning(f"Model {OLLAMA_MODEL} not found. Will pull on first use.")
                else:
                    logger.warning("Ollama not responding")
        except Exception as e:
            logger.warning(f"Ollama not available: {e}. Will use fallback responses.")
    
    def _initialize_rag(self):
        """Initialize RAG components"""
        if not RAG_AVAILABLE:
            logger.warning("RAG components not available")
            return
        
        try:
            logger.info("Initializing RAG components...")
            
            # Initialize embeddings
            self.embeddings = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )
            
            # Initialize text splitter
            self.text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                separators=["\n\n", "\n", ". ", " ", ""]
            )
            
            # Load or create vector store
            if os.path.exists(self.vector_db_path):
                try:
                    self.vector_store = FAISS.load_local(
                        self.vector_db_path,
                        self.embeddings,
                        allow_dangerous_deserialization=True
                    )
                    logger.info("Loaded existing vector store")
                except:
                    self.vector_store = FAISS.from_texts(
                        ["Initial knowledge base"],
                        self.embeddings
                    )
                    logger.info("Created new vector store")
            else:
                self.vector_store = FAISS.from_texts(
                    ["Initial knowledge base"],
                    self.embeddings
                )
                logger.info("Created new vector store")
        except Exception as e:
            logger.error(f"Error initializing RAG: {e}")
            self.vector_store = None
    
    def _initialize_speech(self):
        """Initialize speech components"""
        if not SPEECH_AVAILABLE:
            logger.warning("Speech components not available")
            return
        
        try:
            logger.info("Initializing Whisper STT...")
            
            self.whisper_processor = WhisperProcessor.from_pretrained(
                "openai/whisper-base"  # Using base for lower VRAM
            )
            self.whisper_model = WhisperForConditionalGeneration.from_pretrained(
                "openai/whisper-base"
            )
            
            # Move to device
            if self.device == "cuda":
                free_memory = (
                    torch.cuda.get_device_properties(0).total_memory -
                    torch.cuda.memory_allocated(0)
                )
                if free_memory > 2 * 1024**3:  # 2GB
                    self.whisper_model.to("cuda")
                else:
                    logger.info("Insufficient VRAM for Whisper on GPU, using CPU")
                    self.whisper_model.to("cpu")
            else:
                self.whisper_model.to("cpu")
            
            logger.info("Whisper STT loaded successfully")
        except Exception as e:
            logger.error(f"Error initializing Whisper: {e}")
            self.whisper_model = None
            self.whisper_processor = None
    
    async def generate_response(
        self,
        query: str,
        context: str = "",
        language: str = "en",
        max_tokens: int = 400,
        history: Optional[list] = None,
    ) -> str:
        """Generate response using Ollama LLM"""
        if not self.ollama_available:
            # Try to reconnect
            try:
                async with httpx.AsyncClient(timeout=2.0) as client:
                    response = await client.get(f"{OLLAMA_URL}/api/tags")
                    if response.status_code == 200:
                        self.ollama_available = True
            except:
                pass
        
        if not self.ollama_available:
            return self._generate_fallback_response(query, language, context)
        
        try:
            # Build system prompt for HelioSmart context
            system_prompt = self._get_system_prompt(language)

            # Language-specific labels and a hard reminder injected right before the response token
            lang_meta = {
                "en": ("User", "Assistant", ""),
                "fr": ("Utilisateur", "Assistant", "RAPPEL: réponds uniquement en français.\n"),
                "ar": ("المستخدم", "المساعد", "تذكير صارم: أجب بالعربية الفصحى فقط. ممنوع استخدام أي كلمة إنجليزية أو فرنسية.\n"),
            }
            user_label, assistant_label, lang_reminder = lang_meta.get(language, lang_meta["en"])

            # Build conversation history using language-appropriate labels
            history_str = ""
            if history:
                for role, content in history[-6:]:
                    label = user_label if role == "user" else assistant_label
                    history_str += f"{label}: {content}\n"

            # Language reminder sits immediately before the generation token — small models respect it most here
            if context:
                conversation = f"Context from documents:\n{context}\n\n{history_str}{user_label}: {query}\n{lang_reminder}{assistant_label}:"
            else:
                conversation = f"{history_str}{user_label}: {query}\n{lang_reminder}{assistant_label}:"

            # Use Ollama's dedicated 'system' field — handled separately from the prompt,
            # much more effective at enforcing instructions for small models like llama3.2:3b
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{OLLAMA_URL}/api/generate",
                    json={
                        "model": self.ollama_model,
                        "system": system_prompt,
                        "prompt": conversation,
                        "stream": False,
                        "options": {
                            "temperature": 0.5,  # lower = less creative hallucination / code-switching
                            "top_p": 0.9,
                            "num_predict": max_tokens,
                        }
                    }
                )

                if response.status_code == 200:
                    result = response.json()
                    raw = result.get("response", "").strip()
                    return self._post_process_response(raw, language)
                else:
                    logger.error(f"Ollama error: {response.status_code}")
                    return self._generate_fallback_response(query, language, context)
                    
        except httpx.TimeoutException:
            logger.warning("Ollama request timed out")
            return self._generate_fallback_response(query, language, context)
        except Exception as e:
            logger.error(f"Ollama generation error: {e}")
            return self._generate_fallback_response(query, language, context)
    
    def _get_system_prompt(self, language: str) -> str:
        """Get system prompt based on language"""
        prompts = {
            "en": """You are HelioSmart Assistant, an AI for a solar energy platform in Morocco.
RULE: Respond ONLY in English. Never use Arabic or French words.

You help with: solar panel design, energy production estimates, inverter selection, ROI / payback analysis, CO2 offset, and location-based solar irradiance (PVWatts/NASA POWER).
Be concise — 3-4 sentences max unless more detail is asked.""",

            "fr": """Tu es l'Assistant HelioSmart, une IA pour une plateforme d'énergie solaire au Maroc.
RÈGLE ABSOLUE: Tu dois répondre UNIQUEMENT en français. N'utilise jamais l'anglais, l'arabe ou toute autre langue.

Tu aides avec : conception de systèmes solaires, estimations d'énergie, sélection d'onduleurs, analyse ROI, impact environnemental, et irradiance solaire par localisation.
Sois concis — 3-4 phrases maximum sauf si plus de détails sont demandés.""",

            "ar": """أنت مساعد HelioSmart، ذكاء اصطناعي لمنصة طاقة شمسية في المغرب.
قاعدة صارمة: يجب أن تُجيب بالعربية الفصحى حصراً في كل ردودك. يُحظر تماماً استخدام أي كلمة إنجليزية أو فرنسية أو أجنبية مهما كانت. حتى المصطلحات التقنية يجب ترجمتها إلى العربية.

تساعد المستخدمين في: تصميم أنظمة الألواح الشمسية، تقدير إنتاج الطاقة، اختيار العاكسات، تحليل العائد على الاستثمار وفترة الاسترداد، الأثر البيئي، وتحليل أشعة الشمس حسب الموقع.
كن موجزاً — 3 إلى 4 جمل كحد أقصى ما لم يُطلب مزيد من التفاصيل.""",
        }
        return prompts.get(language, prompts["en"])
    
    def _generate_fallback_response(self, query: str, language: str = "en", context: str = "") -> str:
        """Generate intelligent context-aware responses for HelioSmart solar platform"""
        query_lower = query.lower()
        
        # Identity questions - who are you?
        if any(word in query_lower for word in ['who are you', 'what are you', 'your name', 'qui es-tu', 'tu es qui', 'من أنت', 'ما اسمك']):
            responses = {
                "en": "I'm HelioSmart Assistant, your AI-powered helper for solar energy estimation and consultation. I can help you understand solar panel systems, calculate energy savings, and guide you through the estimation process.",
                "fr": "Je suis l'Assistant HelioSmart, votre aide IA pour l'estimation et la consultation en énergie solaire. Je peux vous aider à comprendre les systèmes de panneaux solaires et calculer vos économies.",
                "ar": "أنا مساعد HelioSmart، مساعدك الذكي لتقدير واستشارات الطاقة الشمسية. يمكنني مساعدتك في فهم أنظمة الألواح الشمسية وحساب توفير الطاقة."
            }
            return responses.get(language, responses["en"])
        
        # Mission/purpose questions
        if any(word in query_lower for word in ['mission', 'purpose', 'goal', 'what do you do', 'mession', 'objectif', 'but', 'مهمة', 'هدف']):
            responses = {
                "en": "My mission is to help you transition to solar energy by providing accurate estimations and expert guidance. HelioSmart uses real solar irradiance data, PVWatts calculations, and industry-standard formulas to design optimal solar systems for your needs.",
                "fr": "Ma mission est de vous aider à passer à l'énergie solaire en fournissant des estimations précises. HelioSmart utilise des données d'irradiance solaire réelles et des calculs PVWatts.",
                "ar": "مهمتي هي مساعدتك في الانتقال إلى الطاقة الشمسية من خلال تقديم تقديرات دقيقة. يستخدم HelioSmart بيانات الإشعاع الشمسي الحقيقية وحسابات PVWatts."
            }
            return responses.get(language, responses["en"])
        
        # App/understand questions
        if any(word in query_lower for word in ['understand', 'explain', 'app', 'application', 'comprendre', 'expliquer', 'فهم', 'شرح', 'التطبيق']):
            responses = {
                "en": "HelioSmart is a solar energy estimation platform with these key features:\n\n☀️ **Solar Estimations** - Create detailed installation estimates\n📊 **Energy Calculations** - Monthly production and savings analysis\n🔌 **System Design** - Panel selection, inverter configuration\n💰 **Financial Planning** - ROI, payback period, cost estimates\n🌍 **Environmental Impact** - CO2 offset calculations\n📍 **Location Analysis** - Solar irradiance for your coordinates\n\nWhat would you like to explore?",
                "fr": "HelioSmart est une plateforme d'estimation d'énergie solaire avec:\n\n☀️ Estimations solaires\n📊 Calculs d'énergie\n🔌 Conception de système\n💰 Planification financière\n🌍 Impact environnemental\n\nQue souhaitez-vous explorer?",
                "ar": "HelioSmart هي منصة تقدير الطاقة الشمسية مع:\n\n☀️ تقديرات الطاقة الشمسية\n📊 حسابات الطاقة\n🔌 تصميم النظام\n💰 التخطيط المالي\n🌍 الأثر البيئي"
            }
            return responses.get(language, responses["en"])
        
        # Solar/panels related
        if any(word in query_lower for word in ['solar', 'panel', 'pv', 'photovoltaic', 'solaire', 'panneau', 'شمسي', 'لوح']):
            responses = {
                "en": "Solar panels convert sunlight into electricity using photovoltaic cells. HelioSmart helps you choose the right panels based on your roof area, energy needs, and budget. We calculate optimal panel count, system capacity, and expected energy production using PVWatts API and real solar irradiance data.",
                "fr": "Les panneaux solaires convertissent la lumière du soleil en électricité. HelioSmart vous aide à choisir les bons panneaux en fonction de la surface de votre toit et de vos besoins énergétiques.",
                "ar": "تحول الألواح الشمسية ضوء الشمس إلى كهرباء. يساعدك HelioSmart في اختيار الألواح المناسبة بناءً على مساحة السطح واحتياجاتك الطاقية."
            }
            return responses.get(language, responses["en"])
        
        # Inverter related
        if any(word in query_lower for word in ['inverter', 'onduleur', 'convertisseur', 'عاكس', 'محول']):
            responses = {
                "en": "Inverters convert DC electricity from solar panels into AC electricity for your home. HelioSmart automatically selects the best inverter configuration based on your system size and performs voltage validation to ensure optimal performance and safety.",
                "fr": "Les onduleurs convertissent le courant continu des panneaux solaires en courant alternatif pour votre maison. HelioSmart sélectionne automatiquement la meilleure configuration.",
                "ar": "تحول العاكسات الكهرباء المستمرة من الألواح الشمسية إلى كهرباء مترددة لمنزلك. يقوم HelioSmart بتحديد أفضل تكوين للعاكس تلقائيًا."
            }
            return responses.get(language, responses["en"])
        
        # Financial/ROI related
        if any(word in query_lower for word in ['cost', 'price', 'money', 'saving', 'roi', 'payback', 'coût', 'prix', 'économie', 'تكلفة', 'سعر', 'توفير']):
            responses = {
                "en": "HelioSmart provides comprehensive financial analysis including:\n\n💰 **System Cost** - Panels, inverters, mounting hardware\n🔧 **Installation** - Labor and additional costs\n📈 **Savings** - Monthly and annual energy bill reduction\n⏱️ **Payback Period** - Time to recover your investment\n🎯 **ROI** - Return on investment over 25 years\n\nWould you like to create an estimation to see your potential savings?",
                "fr": "HelioSmart fournit une analyse financière complète incluant:\n\n💰 Coût du système\n🔧 Installation\n📈 Économies\n⏱️ Période de retour\n🎯 ROI",
                "ar": "يقدم HelioSmart تحليلًا ماليًا شاملًا يشمل:\n\n💰 تكلفة النظام\n🔧 التركيب\n📈 التوفير\n⏱️ فترة الاسترداد\n🎯 العائد على الاستثمار"
            }
            return responses.get(language, responses["en"])
        
        # Energy production related
        if any(word in query_lower for word in ['energy', 'production', 'kwh', 'watt', 'power', 'énergie', 'production', 'production', 'طاقة', 'إنتاج']):
            responses = {
                "en": "HelioSmart uses PVWatts API and NASA POWER data to calculate accurate energy production estimates. We consider your location's solar irradiance, panel specifications, system losses, and local weather patterns to predict monthly and annual energy generation.",
                "fr": "HelioSmart utilise l'API PVWatts et les données NASA POWER pour calculer les estimations de production d'énergie précises.",
                "ar": "يستخدم HelioSmart واجهة برمجة تطبيقات PVWatts وبيانات NASA POWER لحساب تقديرات إنتاج الطاقة بدقة."
            }
            return responses.get(language, responses["en"])
        
        # Installation/roof related
        if any(word in query_lower for word in ['roof', 'installation', 'mount', 'toit', 'installation', 'سقف', 'تركيب']):
            responses = {
                "en": "HelioSmart analyzes your roof characteristics including type (flat, pitched), material, tilt angle, and available area. We use this data to recommend optimal panel placement and calculate mounting structure requirements including rails, clamps, and supports.",
                "fr": "HelioSmart analyse les caractéristiques de votre toit pour recommander le placement optimal des panneaux.",
                "ar": "يحلل HelioSmart خصائص سطحك لتقديم توصيات بشأن أفضل موضع للألواح."
            }
            return responses.get(language, responses["en"])
        
        # Location/Morocco related
        if any(word in query_lower for word in ['morocco', 'location', 'address', 'maroc', 'emplacement', 'adresse', 'المغرب', 'موقع']):
            responses = {
                "en": "HelioSmart is optimized for solar installations in Morocco. We use location-specific data including solar irradiance from NASA POWER API, local electricity rates, and Morocco-specific environmental factors like wind and snow loads to provide accurate estimates.",
                "fr": "HelioSmart est optimisé pour les installations solaires au Maroc. Nous utilisons des données spécifiques à l'emplacement.",
                "ar": "تم تحسين HelioSmart لتثبيتات الطاقة الشمسية في المغرب. نستخدم بيانات خاصة بالموقع."
            }
            return responses.get(language, responses["en"])
        
        # Greeting - Arabic/Islamic
        if any(word in query_lower for word in ['salam', 'السلام', 'عليكم', 'مرحبا']):
            responses = {
                "en": "Wa alaikum assalam! Welcome to HelioSmart. I'm here to help you with solar energy estimation and consultation. How can I assist you with your solar project today?",
                "fr": "Wa alaikum assalam! Bienvenue sur HelioSmart. Je suis là pour vous aider avec l'estimation de l'énergie solaire.",
                "ar": "وعليكم السلام! مرحباً بك في HelioSmart. أنا هنا لمساعدتك في تقدير الطاقة الشمسية والاستشارات."
            }
            return responses.get(language, responses["en"])
        
        # Greeting - General
        if any(word in query_lower for word in ['hello', 'hi', 'hey', 'bonjour', 'salut', 'bonsoir']):
            responses = {
                "en": "Hello! 👋 I'm HelioSmart Assistant, your AI helper for solar energy. I can help you with:\n\n☀️ Solar system design and estimations\n📊 Energy production calculations\n💰 Financial analysis and ROI\n🔌 Inverter and wiring specifications\n🌍 Environmental impact assessment\n\nWhat would you like to know?",
                "fr": "Bonjour! 👋 Je suis l'Assistant HelioSmart. Je peux vous aider avec:\n\n☀️ Conception de systèmes solaires\n📊 Calculs de production\n💰 Analyse financière\n🔌 Spécifications techniques",
                "ar": "مرحباً! 👋 أنا مساعد HelioSmart. يمكنني مساعدتك في:\n\n☀️ تصميم أنظمة الطاقة الشمسية\n📊 حسابات إنتاج الطاقة\n💰 التحليل المالي\n🔌 المواصفات التقنية"
            }
            return responses.get(language, responses["en"])
        
        # Help/how to
        if any(word in query_lower for word in ['help', 'how', 'comment', 'aide', 'كيف', 'مساعدة']):
            responses = {
                "en": "I can help you with:\n\n1️⃣ **Solar Estimations** - Create and manage estimates\n2️⃣ **System Design** - Panel selection and configuration\n3️⃣ **Financial Analysis** - ROI and savings calculations\n4️⃣ **Energy Production** - Monthly and annual estimates\n5️⃣ **Technical Specs** - Wiring, inverters, mounting\n\nJust ask about any of these topics!",
                "fr": "Je peux vous aider avec:\n\n1️⃣ Estimations solaires\n2️⃣ Conception de système\n3️⃣ Analyse financière\n4️⃣ Production d'énergie\n5️⃣ Spécifications techniques",
                "ar": "يمكنني مساعدتك في:\n\n1️⃣ تقديرات الطاقة الشمسية\n2️⃣ تصميم النظام\n3️⃣ التحليل المالي\n4️⃣ إنتاج الطاقة\n5️⃣ المواصفات التقنية"
            }
            return responses.get(language, responses["en"])
        
        # Thanks
        if any(word in query_lower for word in ['thank', 'merci', 'شكر', 'thanks']):
            responses = {
                "en": "You're welcome! 😊 If you have more questions about solar energy or the HelioSmart platform, feel free to ask. I'm here to help with your solar journey!",
                "fr": "De rien! 😊 Si vous avez d'autres questions sur l'énergie solaire ou HelioSmart, n'hésitez pas à demander!",
                "ar": "على الرحب والسعة! 😊 إذا كان لديك المزيد من الأسئلة حول الطاقة الشمسية أو HelioSmart، لا تتردد في السؤال!"
            }
            return responses.get(language, responses["en"])
        
        # Default response
        responses = {
            "en": "I'm HelioSmart Assistant, here to help with solar energy estimation and consultation. You can ask me about:\n\n• Solar panel systems and configurations\n• Energy production and savings estimates\n• Financial analysis and ROI calculations\n• Inverter selection and wiring specs\n• Installation requirements and process\n• Environmental impact of going solar\n\nHow can I assist you?",
            "fr": "Je suis l'Assistant HelioSmart, ici pour vous aider avec l'estimation de l'énergie solaire. Vous pouvez me demander:\n\n• Systèmes de panneaux solaires\n• Estimations de production et d'économies\n• Analyse financière\n• Sélection d'onduleurs",
            "ar": "أنا مساعد HelioSmart، هنا للمساعدة في تقدير الطاقة الشمسية. يمكنك أن تسألني عن:\n\n• أنظمة الألواح الشمسية\n• تقديرات الإنتاج والتوفير\n• التحليل المالي\n• اختيار العاكسات"
        }
        return responses.get(language, responses["en"])
    
    def _post_process_response(self, text: str, language: str) -> str:
        """Clean up LLM response"""
        # Remove generation prompts
        text = re.sub(r'System:|User:|Response:', '', text)
        # Remove markdown code blocks
        text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
        # Remove extra spaces
        text = re.sub(r'\s+', ' ', text).strip()
        return text
    
    def get_rag_context(self, query: str) -> str:
        """Retrieve context from vector store"""
        if not self.vector_store or not query:
            return ""
        
        try:
            docs = self.vector_store.similarity_search(query, k=3)
            context = "\n\n".join([d.page_content for d in docs])
            return context
        except Exception as e:
            logger.error(f"RAG retrieval error: {e}")
            return ""
    
    def add_document_to_rag(self, file_path: str) -> Dict[str, Any]:
        """Add document to vector store"""
        if not self.vector_store or not self.text_splitter:
            return {"error": "RAG not available"}
        
        try:
            # Extract text from file
            content = ""
            if file_path.endswith(".txt"):
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
            elif file_path.endswith(".pdf"):
                try:
                    from pypdf import PdfReader
                    reader = PdfReader(file_path)
                    for page in reader.pages:
                        content += page.extract_text() + "\n"
                except ImportError:
                    return {"error": "PDF support not available"}
            
            if not content:
                return {"error": "No text extracted"}
            
            # Split and add to store
            chunks = self.text_splitter.split_text(content)
            self.vector_store.add_texts(chunks)
            self.vector_store.save_local(self.vector_db_path)
            
            return {
                "status": "success",
                "chunks_added": len(chunks),
                "file": os.path.basename(file_path)
            }
        except Exception as e:
            logger.error(f"Document processing error: {e}")
            return {"error": str(e)}
    
    def transcribe_audio(self, audio_file_path: str) -> Tuple[str, str]:
        """Transcribe audio using Whisper"""
        if not self.whisper_model or not self.whisper_processor or not SPEECH_AVAILABLE:
            return "STT not available", "en"
        
        try:
            # Convert to 16kHz WAV with proper handling
            temp_wav = f"{os.path.splitext(audio_file_path)[0]}_processed.wav"
            
            logger.info(f"Transcribing audio file: {audio_file_path}")
            
            # Load audio file (handles webm, wav, mp3, etc.)
            audio = AudioSegment.from_file(audio_file_path)
            
            # Convert to mono, 16kHz for Whisper
            audio = audio.set_channels(1).set_frame_rate(16000)
            
            # Normalize audio levels
            audio = audio.normalize()
            
            # Export as WAV
            audio.export(temp_wav, format="wav")
            
            logger.info(f"Audio converted: duration={len(audio)/1000:.2f}s, format=wav, rate=16kHz")
            
            # Read audio
            audio_data, sample_rate = sf.read(temp_wav)
            
            logger.info(f"Audio data shape: {audio_data.shape}, sample_rate: {sample_rate}")
            
            # Process with Whisper
            whisper_device = next(self.whisper_model.parameters()).device
            input_features = self.whisper_processor(
                audio_data,
                sampling_rate=sample_rate,
                return_tensors="pt"
            ).input_features.to(whisper_device)
            
            # Generate transcription with language detection
            with torch.no_grad():
                predicted_ids = self.whisper_model.generate(
                    input_features,
                    max_new_tokens=440,
                    language="en",
                    task="transcribe"
                )
            
            # Decode
            transcription = self.whisper_processor.batch_decode(
                predicted_ids,
                skip_special_tokens=True
            )[0]
            
            logger.info(f"Transcription result: '{transcription}'")
            
            # Cleanup
            if os.path.exists(temp_wav):
                os.remove(temp_wav)
            
            # Return transcription or default if empty
            if transcription and transcription.strip():
                return transcription.strip(), "en"
            else:
                return "Could not understand audio. Please speak clearly.", "en"
                
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return f"Error transcribing audio: {str(e)}", "en"
    
    def generate_speech(self, text: str, language: str = "en") -> Optional[str]:
        """Generate speech from text using gTTS"""
        if not TTS_AVAILABLE or not text:
            return None
        
        try:
            lang_map = {"en": "en", "fr": "fr", "ar": "ar"}
            target_lang = lang_map.get(language, "en")
            
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            filename = f"{self.audio_path}/response_{timestamp}_{target_lang}.mp3"
            
            tts = gTTS(text=text, lang=target_lang, slow=False)
            tts.save(filename)
            
            return filename
        except Exception as e:
            logger.error(f"TTS error: {e}")
            return None
    
    def get_status(self) -> Dict[str, Any]:
        """Get chatbot status"""
        return {
            "device": self.device,
            "llm_available": self.ollama_available,
            "llm_model": self.ollama_model if self.ollama_available else None,
            "ollama_url": OLLAMA_URL,
            "rag_available": self.vector_store is not None,
            "stt_available": self.whisper_model is not None,
            "tts_available": TTS_AVAILABLE,
        }

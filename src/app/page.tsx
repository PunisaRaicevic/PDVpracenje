import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-lime-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative px-6 py-4 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 relative">
            <svg viewBox="0 0 40 40" className="w-10 h-10">
              <circle cx="20" cy="20" r="8" fill="none" stroke="#3ECFB2" strokeWidth="2"/>
              <path d="M20 4 L22 10 L18 10 Z" fill="#3ECFB2"/>
              <path d="M20 36 L22 30 L18 30 Z" fill="#9ACD32"/>
              <path d="M4 20 L10 22 L10 18 Z" fill="#3ECFB2"/>
              <path d="M36 20 L30 22 L30 18 Z" fill="#9ACD32"/>
              <path d="M8.5 8.5 L13 12 L11 14 Z" fill="#3ECFB2"/>
              <path d="M31.5 31.5 L27 28 L29 26 Z" fill="#9ACD32"/>
              <path d="M31.5 8.5 L27 12 L29 14 Z" fill="#9ACD32"/>
              <path d="M8.5 31.5 L13 28 L11 26 Z" fill="#3ECFB2"/>
            </svg>
          </div>
          <span className="text-2xl font-bold text-white tracking-wide">SERVICEX</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-navy-300 hover:text-white font-medium transition-colors">
            Prijava
          </Link>
          <Link
            href="/register"
            className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition font-medium"
          >
            Registracija
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-20 max-w-7xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Automatski izvuci podatke <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-lime-400">iz faktura za racunovodstvo</span>
        </h1>
        <p className="text-xl text-navy-300 mb-8 max-w-2xl mx-auto">
          Uploaduj PDF ili sliku fakture - mi cemo automatski izvuci sve podatke
          koje tvoj racunovodja treba. Provjeri, potvrdi i posalji u sekundi.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/register"
            className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-8 py-4 rounded-xl hover:from-teal-600 hover:to-teal-700 transition font-semibold text-lg shadow-lg shadow-teal-500/30"
          >
            Pocni besplatno
          </Link>
          <a
            href="#kako-radi"
            className="bg-navy-700 text-white px-8 py-4 rounded-xl hover:bg-navy-600 transition font-semibold text-lg border border-navy-600"
          >
            Kako radi?
          </a>
        </div>

        {/* Hero Cards */}
        <div className="mt-16 bg-navy-800/60 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto border border-navy-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-navy-900/50 rounded-xl p-6 text-left border border-navy-700">
              <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-1">Upload</h3>
              <p className="text-sm text-navy-400">PDF ili slika fakture</p>
            </div>
            <div className="bg-navy-900/50 rounded-xl p-6 text-left border border-navy-700">
              <div className="w-12 h-12 bg-lime-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-1">Provjera</h3>
              <p className="text-sm text-navy-400">Provjeri izvucene podatke</p>
            </div>
            <div className="bg-navy-900/50 rounded-xl p-6 text-left border border-navy-700">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-1">Posalji</h3>
              <p className="text-sm text-navy-400">Direktno racunovodji</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="kako-radi" className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-4">
            Kako radi?
          </h2>
          <p className="text-navy-400 text-center mb-16 max-w-2xl mx-auto">
            Tri jednostavna koraka od fakture do racunovodstva
          </p>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-teal-500/30">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Uploaduj fakturu</h3>
              <p className="text-navy-400">
                Jednostavno prevuci PDF ili sliku fakture u aplikaciju.
                Podrzan je bilo koji format - skenirana faktura, fotografija, ili digitalni PDF.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-lime-500 to-lime-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-lime-500/30">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Automatska obrada</h3>
              <p className="text-navy-400">
                Nasa AI tehnologija automatski prepoznaje i izvlaci sve bitne podatke:
                prodavac, iznos, PDV, datum, broj fakture i vise.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-yellow-500/30">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Provjeri i posalji</h3>
              <p className="text-navy-400">
                Pregledaj izvucene podatke, ispravi ako treba, i jednim klikom
                posalji svom racunovodji. Gotovo!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-4">
            Zasto SERVICEX?
          </h2>
          <p className="text-navy-400 text-center mb-16 max-w-2xl mx-auto">
            Ustedi vrijeme i izbjegni greske u racunovodstvu
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-navy-800/60 backdrop-blur-sm p-6 rounded-xl border border-navy-700 hover:border-teal-500/50 transition-colors">
              <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Brza obrada</h3>
              <p className="text-navy-400 text-sm">
                Faktura se obradi u nekoliko sekundi. Nema vise rucnog prepisivanja podataka.
              </p>
            </div>

            <div className="bg-navy-800/60 backdrop-blur-sm p-6 rounded-xl border border-navy-700 hover:border-lime-500/50 transition-colors">
              <div className="w-12 h-12 bg-lime-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Visoka preciznost</h3>
              <p className="text-navy-400 text-sm">
                AI prepoznaje podatke sa visokom tacnoscu. Plus, uvijek imas mogucnost provjere.
              </p>
            </div>

            <div className="bg-navy-800/60 backdrop-blur-sm p-6 rounded-xl border border-navy-700 hover:border-yellow-500/50 transition-colors">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Sigurnost podataka</h3>
              <p className="text-navy-400 text-sm">
                Tvoji podaci su sigurni i enkriptovani. Samo ti i tvoj racunovodja imate pristup.
              </p>
            </div>

            <div className="bg-navy-800/60 backdrop-blur-sm p-6 rounded-xl border border-navy-700 hover:border-orange-500/50 transition-colors">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Svi formati</h3>
              <p className="text-navy-400 text-sm">
                PDF, JPG, PNG - uploaduj fakturu u bilo kom formatu, cak i fotografiju telefonom.
              </p>
            </div>

            <div className="bg-navy-800/60 backdrop-blur-sm p-6 rounded-xl border border-navy-700 hover:border-red-500/50 transition-colors">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Historija faktura</h3>
              <p className="text-navy-400 text-sm">
                Sve tvoje fakture na jednom mjestu. Pretrazi, filtriraj i izvezi kada ti treba.
              </p>
            </div>

            <div className="bg-navy-800/60 backdrop-blur-sm p-6 rounded-xl border border-navy-700 hover:border-purple-500/50 transition-colors">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Tim pristup</h3>
              <p className="text-navy-400 text-sm">
                Dodaj clanove tima ili racunovodju. Svi vide iste podatke u realnom vremenu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-teal-500/20 to-lime-500/20 backdrop-blur-sm rounded-2xl p-12 text-center border border-teal-500/30">
            <h2 className="text-3xl font-bold text-white mb-4">
              Spreman da ustedis vrijeme na fakturama?
            </h2>
            <p className="text-navy-300 mb-8 text-lg">
              Pocni besplatno. Bez kreditne kartice. Otkazi kada zelis.
            </p>
            <Link
              href="/register"
              className="inline-block bg-gradient-to-r from-teal-500 to-teal-600 text-white px-8 py-4 rounded-xl hover:from-teal-600 hover:to-teal-700 transition font-semibold text-lg shadow-lg shadow-teal-500/30"
            >
              Kreiraj besplatan nalog
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-6 py-12 border-t border-navy-700">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <div className="w-8 h-8 relative">
              <svg viewBox="0 0 40 40" className="w-8 h-8">
                <circle cx="20" cy="20" r="8" fill="none" stroke="#3ECFB2" strokeWidth="2"/>
                <path d="M20 4 L22 10 L18 10 Z" fill="#3ECFB2"/>
                <path d="M20 36 L22 30 L18 30 Z" fill="#9ACD32"/>
                <path d="M4 20 L10 22 L10 18 Z" fill="#3ECFB2"/>
                <path d="M36 20 L30 22 L30 18 Z" fill="#9ACD32"/>
              </svg>
            </div>
            <span className="text-white font-semibold">SERVICEX</span>
          </div>
          <p className="text-sm text-navy-500">
            &copy; 2024 SERVICEX. Sva prava zadrzana.
          </p>
        </div>
      </footer>
    </div>
  )
}

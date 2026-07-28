import core from './core.js'
import mobile from './mobile.js'
import marketplace from './marketplace.js'
import workspace from './workspace.js'
import extensions from './extensions.js'
import pages from './pages.js'
import compliance from './compliance.js'
import searchPage from './searchPage.js'

export default {
  localeName: 'English',
  ...core,
  ...mobile,
  ...marketplace,
  ...workspace,
  ...extensions,
  ...pages,
  compliance,
  searchPage,
}

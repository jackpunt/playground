"""Module for dealing with project templates."""

from google.appengine.api import memcache
from google.appengine.api import taskqueue
from google.appengine.ext import ndb

from .. import model
from .. import settings
from .. import shared

from . import codesite
from . import filesystem
from . import github


# tuples containing templates (uri, description)
REPO_COLLECTIONS = [
    # TEMPLATE_PROJECT_DIR here so we populate filesystem templates first
    (settings.TEMPLATE_PROJECT_DIR, 'Cloud Playground Built-In Templates'),
    #('https://api.github.com/users/fredsa/repos',
    # 'Fred''s samples on github'),
    #('https://api.github.com/users/GoogleCloudPlatform/repos',
    # 'Google Cloud Platform samples on github'),
    # ('https://google-app-engine-samples.googlecode.com/svn/trunk/',
    #  'Python App Engine Samples'),
    # ('https://google-app-engine-samples.googlecode.com/svn/trunk/python27/',
    #  'Python 2.7 App Engine Samples'),
]

_MEMCACHE_KEY_REPO_COLLECTIONS = '{0}'.format(model.RepoCollection.__name__)

_MEMCACHE_KEY_TEMPLATES = '{0}'.format(model.Repo.__name__)


def ClearCache():
  # TODO: determine why the just deleting our keys is insufficient:
  # memcache.delete_multi(keys=[_MEMCACHE_KEY_REPO_COLLECTIONS,
  #                       _MEMCACHE_KEY_TEMPLATES])
  memcache.flush_all()


def GetRepoCollections():
  """Get repo collections."""
  repo_collections = memcache.get(_MEMCACHE_KEY_REPO_COLLECTIONS,
                                  namespace=settings.PLAYGROUND_NAMESPACE)
  if repo_collections:
    return repo_collections
  query = model.RepoCollection.query(ancestor=model.GetGlobalRootEntity().key)
  repo_collections = query.fetch()
  if not repo_collections:
    repo_collections = _GetRepoCollections()
  repo_collections.sort(key=lambda repo_collection: repo_collection.description)
  memcache.set(_MEMCACHE_KEY_REPO_COLLECTIONS,
               repo_collections,
               namespace=settings.PLAYGROUND_NAMESPACE,
               time=settings.TEMPLATE_MEMCACHE_TIME)
  return repo_collections


@ndb.transactional(xg=True)
def _GetRepoCollections():
  repo_collections = []
  for uri, description in REPO_COLLECTIONS:
    repo_collection = model.GetOrInsertRepoCollection(uri, description)
    task = taskqueue.add(queue_name='repo',
                         url='/_playground_tasks/populate_repo_collection',
                         params={
                             'repo_collection_url': repo_collection.key.id(),
                         }, transactional=True)
    shared.w('adding task {} to populate repo collection {!r}'.format(task.name,
                                                                      uri))
    repo_collections.append(repo_collection)
  ndb.put_multi(repo_collections)
  return repo_collections


def GetCollection(repo_collection_url):
  repo_collection = model.GetRepoCollection(repo_collection_url)
  if filesystem.IsValidUrl(repo_collection_url):
    return filesystem.FilesystemRepoCollection(repo_collection)
  elif codesite.IsValidUrl(repo_collection_url):
    return codesite.CodesiteRepoCollection(repo_collection)
  elif github.IsValidUrl(repo_collection_url):
    return github.GithubRepoCollection(repo_collection)
  else:
    shared.w('Unrecognized repo collection URL {0}'
             .format(repo_collection_url))
    return None

import { BookmarkGroup } from './BookmarkGroup'

export function BookmarkGroupList(props) {
  return (
    <div class="container px-4 py-5" id="icon-grid">
      {Array.isArray(props.groups) && props.groups.map(group => (
        <BookmarkGroup key={group.name} group={group.name} bookmarks={group.bookmarks} layoutPrefs={props.layoutPrefs} />
      ))}
    </div>
  )
}

export default BookmarkGroupList;

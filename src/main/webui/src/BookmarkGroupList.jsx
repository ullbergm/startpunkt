import { BookmarkGroup } from './BookmarkGroup'

export function BookmarkGroupList(props) {
  return (
    <div class="container px-4 py-5" id="icon-grid">
      {
        props.groups.map(
          (group) => (
            <BookmarkGroup group={group.name} bookmarks={group.bookmarks} />
          )
        )
      }
    </div>
  )
}

export default BookmarkGroupList;

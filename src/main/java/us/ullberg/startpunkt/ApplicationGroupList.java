package us.ullberg.startpunkt;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ApplicationGroupList {
  private List<ApplicationGroup> list;

  public ApplicationGroupList(List<ApplicationGroup> list) {
    this.list = list;
  }

  @JsonProperty("groups")
  public List<ApplicationGroup> groups() {
    return list;
  }
}
